package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	_ "github.com/lib/pq"
)

type Apolice struct {
	Luc        string `json:"luc"`
	Fantasia   string `json:"fantasia"`
	Segmento   string `json:"segmento"`
	Seguradora string `json:"seguradora"`
	Vigencia   string `json:"vigencia"`
	Vencimento string `json:"vencimento"`
	Status     string `json:"status"`
}

func getApolices(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		// The table is "Apolices"
		rows, err := db.Query(`SELECT luc, fantasia, segmento, seguradora, vigencia, vencimento, status_da_apolice FROM "Apolices"`)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var apolices []Apolice
		for rows.Next() {
			var a Apolice
			var vigencia, vencimento time.Time
			var fantasia sql.NullString
			var segmento sql.NullString
			var seguradora sql.NullString
			var status sql.NullString

			err := rows.Scan(&a.Luc, &fantasia, &segmento, &seguradora, &vigencia, &vencimento, &status)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			
			a.Fantasia = fantasia.String
			a.Segmento = segmento.String
			a.Seguradora = seguradora.String
			a.Status = status.String

			// Format dates to DD/MM/YYYY to match what the frontend expects
			if !vigencia.IsZero() {
				a.Vigencia = vigencia.Format("02/01/2006")
			}
			if !vencimento.IsZero() {
				a.Vencimento = vencimento.Format("02/01/2006")
			}
			apolices = append(apolices, a)
		}

		if apolices == nil {
			apolices = []Apolice{}
		}

		json.NewEncoder(w).Encode(apolices)
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

	// API endpoint
	http.HandleFunc("/api/apolices", getApolices(db))

	// Servidor de arquivos estáticos
	fileserver := http.FileServer(http.Dir("./static/dist"))
	http.Handle("/", fileserver)

	fmt.Println("Servidor rodando em http://localhost:8082")
	log.Fatal(http.ListenAndServe(":8082", nil))
}
