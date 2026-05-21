package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

const apolicesTable = `"Apolices"`

type Apolice struct {
	Luc             string `json:"luc"`
	Fantasia        string `json:"fantasia"`
	Segmento        string `json:"segmento"`
	Seguradora      string `json:"seguradora"`
	Vigencia        string `json:"vigencia"`
	Vencimento      string `json:"vencimento"`
	Status          string `json:"status"`
	StatusDaApolice string `json:"status_da_apolice"`
}

func parsePolicyDate(value string) (time.Time, error) {
	layouts := []string{"2006-01-02", "02/01/2006"}
	for _, layout := range layouts {
		if parsed, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, fmt.Errorf("data inválida: %s", value)
}

func calculatePolicyStatus(vencimento time.Time) string {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dueDate := time.Date(vencimento.Year(), vencimento.Month(), vencimento.Day(), 0, 0, 0, 0, now.Location())
	daysRemaining := int(dueDate.Sub(today).Hours() / 24)

	if daysRemaining < 0 {
		return "Vencida"
	}
	if daysRemaining <= 30 {
		return "A Vencer"
	}
	return "Ativa"
}

func scanApolice(scanner interface{ Scan(...any) error }) (Apolice, error) {
	var apolice Apolice
	var vigencia time.Time
	var vencimento time.Time
	var fantasia sql.NullString
	var segmento sql.NullString
	var seguradora sql.NullString
	var status sql.NullString

	if err := scanner.Scan(&apolice.Luc, &fantasia, &segmento, &seguradora, &vigencia, &vencimento, &status); err != nil {
		return Apolice{}, err
	}

	apolice.Fantasia = fantasia.String
	apolice.Segmento = segmento.String
	apolice.Seguradora = seguradora.String

	if !vigencia.IsZero() {
		apolice.Vigencia = vigencia.Format("02/01/2006")
	}
	if !vencimento.IsZero() {
		apolice.Vencimento = vencimento.Format("02/01/2006")
		apolice.Status = calculatePolicyStatus(vencimento)
	} else {
		apolice.Status = strings.TrimSpace(status.String)
	}
	if apolice.Status == "" {
		apolice.Status = calculatePolicyStatus(time.Now())
	}
	apolice.StatusDaApolice = apolice.Status

	return apolice, nil
}

func decodeApolicePayload(r *http.Request) (struct {
	Luc        string `json:"luc"`
	Fantasia   string `json:"fantasia"`
	Segmento   string `json:"segmento"`
	Seguradora string `json:"seguradora"`
	Vigencia   string `json:"vigencia"`
	Vencimento string `json:"vencimento"`
}, error) {
	var payload struct {
		Luc        string `json:"luc"`
		Fantasia   string `json:"fantasia"`
		Segmento   string `json:"segmento"`
		Seguradora string `json:"seguradora"`
		Vigencia   string `json:"vigencia"`
		Vencimento string `json:"vencimento"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return payload, err
	}

	payload.Luc = strings.TrimSpace(payload.Luc)
	payload.Fantasia = strings.TrimSpace(payload.Fantasia)
	payload.Segmento = strings.TrimSpace(payload.Segmento)
	payload.Seguradora = strings.TrimSpace(payload.Seguradora)
	payload.Vigencia = strings.TrimSpace(payload.Vigencia)
	payload.Vencimento = strings.TrimSpace(payload.Vencimento)

	return payload, nil
}

func apolicesHandler(db *sql.DB, routePrefix string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		requestedPath := strings.TrimSuffix(r.URL.Path, "/")
		normalizedPrefix := strings.TrimSuffix(routePrefix, "/")
		itemID := strings.TrimPrefix(requestedPath, normalizedPrefix)
		itemID = strings.TrimPrefix(itemID, "/")
		isCollection := itemID == ""

		switch r.Method {
		case http.MethodGet:
			if isCollection {
				rows, err := db.Query(fmt.Sprintf(`SELECT luc, fantasia, segmento, seguradora, vigencia, vencimento, status_da_apolice FROM %s ORDER BY luc`, apolicesTable))
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				defer rows.Close()

				apolices := make([]Apolice, 0)
				for rows.Next() {
					apolice, err := scanApolice(rows)
					if err != nil {
						http.Error(w, err.Error(), http.StatusInternalServerError)
						return
					}
					apolices = append(apolices, apolice)
				}

				if apolices == nil {
					apolices = []Apolice{}
				}

				json.NewEncoder(w).Encode(apolices)
				return
			}

			row := db.QueryRow(fmt.Sprintf(`SELECT luc, fantasia, segmento, seguradora, vigencia, vencimento, status_da_apolice FROM %s WHERE luc = $1`, apolicesTable), itemID)
			apolice, err := scanApolice(row)
			if err != nil {
				if err == sql.ErrNoRows {
					http.Error(w, "Apólice não encontrada", http.StatusNotFound)
					return
				}
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(apolice)
			return

		case http.MethodPost:
			if !isCollection {
				http.Error(w, "Método não permitido", http.StatusMethodNotAllowed)
				return
			}

			payload, err := decodeApolicePayload(r)
			if err != nil {
				http.Error(w, "JSON inválido", http.StatusBadRequest)
				return
			}

			if payload.Luc == "" || payload.Fantasia == "" || payload.Segmento == "" || payload.Seguradora == "" || payload.Vigencia == "" || payload.Vencimento == "" {
				http.Error(w, "Todos os campos são obrigatórios", http.StatusBadRequest)
				return
			}

			vigencia, err := parsePolicyDate(payload.Vigencia)
			if err != nil {
				http.Error(w, "Vigência inválida", http.StatusBadRequest)
				return
			}
			vencimento, err := parsePolicyDate(payload.Vencimento)
			if err != nil {
				http.Error(w, "Vencimento inválido", http.StatusBadRequest)
				return
			}

			status := calculatePolicyStatus(vencimento)

			var apolice Apolice
			err = db.QueryRow(
				fmt.Sprintf(`INSERT INTO %s (luc, fantasia, segmento, seguradora, vigencia, vencimento, status_da_apolice)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 RETURNING luc, fantasia, segmento, seguradora, vigencia, vencimento, status_da_apolice`, apolicesTable),
				payload.Luc,
				payload.Fantasia,
				payload.Segmento,
				payload.Seguradora,
				vigencia,
				vencimento,
				status,
			).Scan(&apolice.Luc, &apolice.Fantasia, &apolice.Segmento, &apolice.Seguradora, &vigencia, &vencimento, &apolice.StatusDaApolice)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			apolice.Vigencia = vigencia.Format("02/01/2006")
			apolice.Vencimento = vencimento.Format("02/01/2006")
			apolice.Status = status
			apolice.StatusDaApolice = status

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(apolice)
			return

		case http.MethodPut:
			if isCollection {
				http.Error(w, "Informe o LUC da apólice na URL", http.StatusBadRequest)
				return
			}

			payload, err := decodeApolicePayload(r)
			if err != nil {
				http.Error(w, "JSON inválido", http.StatusBadRequest)
				return
			}

			if payload.Luc == "" || payload.Fantasia == "" || payload.Segmento == "" || payload.Seguradora == "" || payload.Vigencia == "" || payload.Vencimento == "" {
				http.Error(w, "Todos os campos são obrigatórios", http.StatusBadRequest)
				return
			}

			vigencia, err := parsePolicyDate(payload.Vigencia)
			if err != nil {
				http.Error(w, "Vigência inválida", http.StatusBadRequest)
				return
			}
			vencimento, err := parsePolicyDate(payload.Vencimento)
			if err != nil {
				http.Error(w, "Vencimento inválido", http.StatusBadRequest)
				return
			}

			status := calculatePolicyStatus(vencimento)

			row := db.QueryRow(
				fmt.Sprintf(`UPDATE %s
				 SET luc = $1, fantasia = $2, segmento = $3, seguradora = $4, vigencia = $5, vencimento = $6, status_da_apolice = $7
				 WHERE luc = $8
				 RETURNING luc, fantasia, segmento, seguradora, vigencia, vencimento, status_da_apolice`, apolicesTable),
				payload.Luc,
				payload.Fantasia,
				payload.Segmento,
				payload.Seguradora,
				vigencia,
				vencimento,
				status,
				itemID,
			)

			apolice, err := scanApolice(row)
			if err != nil {
				if err == sql.ErrNoRows {
					http.Error(w, "Apólice não encontrada", http.StatusNotFound)
					return
				}
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			json.NewEncoder(w).Encode(apolice)
			return

		case http.MethodDelete:
			if isCollection {
				http.Error(w, "Informe o LUC da apólice na URL", http.StatusBadRequest)
				return
			}

			res, err := db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE luc = $1`, apolicesTable), itemID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			rowsAffected, err := res.RowsAffected()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if rowsAffected == 0 {
				http.Error(w, "Apólice não encontrada", http.StatusNotFound)
				return
			}

			w.WriteHeader(http.StatusNoContent)
			return

		default:
			http.Error(w, "Método não permitido", http.StatusMethodNotAllowed)
			return
		}
	}
}

func main() {
	// String de conexão atualizada
	connStr := "host=localhost port=5432 user=postgres password=S1wVEXwvRr dbname=seguros_db sslmode=disable"

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Erro no driver:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		// Attempt fallback to postgres dbname if seguros_db fails
		connStrFallback := "host=localhost port=5432 user=postgres password=S1wVEXwvRr dbname=postgres sslmode=disable"
		dbFallback, errFallback := sql.Open("postgres", connStrFallback)
		if errFallback == nil && dbFallback.Ping() == nil {
			db = dbFallback
			fmt.Println("Conectado ao PostgreSQL (dbname=postgres) com sucesso!")
		} else {
			log.Fatal("Não conectou ao banco. Verifique a senha e o dbname!", err)
		}
	} else {
		fmt.Println("Conectado ao PostgreSQL (dbname=seguros_db) com sucesso!")
	}

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		log.Fatal("Não foi possível resolver o diretório do projeto")
	}
	baseDir := filepath.Dir(currentFile)

	// API endpoint
	http.HandleFunc("/api/apolices", apolicesHandler(db, "/api/apolices"))
	http.HandleFunc("/api/apolices/", apolicesHandler(db, "/api/apolices"))
	http.HandleFunc("/apolices", apolicesHandler(db, "/apolices"))
	http.HandleFunc("/apolices/", apolicesHandler(db, "/apolices"))

	// Servidor de arquivos estáticos: prefira ./static/dist, senão ./static
	staticPath := filepath.Join(baseDir, "static", "dist")
	if _, err := os.Stat(staticPath); os.IsNotExist(err) {
		staticPath = filepath.Join(baseDir, "static")
	}

	fs := http.FileServer(http.Dir(staticPath))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Resolve the requested path inside the static folder
		p := filepath.Join(staticPath, r.URL.Path)
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}
		// Fallback to index.html for SPA routes or when file not found
		http.ServeFile(w, r, filepath.Join(staticPath, "index.html"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	fmt.Printf("Servidor rodando em http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
