package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"text/tabwriter"

	_ "github.com/lib/pq"
)

type Apolice struct {
	luc        string
	fantasia   string
	segmento   string
	seguradora string
	vigencia   string
	vencimento string
}

func lerEntrada(mensagem string, reader *bufio.Reader) string {
	fmt.Print(mensagem)
	texto, _ := reader.ReadString('\n')
	return strings.TrimSpace(texto)
}

func pause(reader *bufio.Reader) {
	fmt.Print("\nPressione ENTER para continuar...")
	reader.ReadString('\n')
}

func inserirApolice(db *sql.DB, a Apolice) error {
	sqlStatement := `
		INSERT INTO "Apolices" (
			codigo_apolice, "luc", "fantasia", "segmento", "seguradora", "vigencia", "vencimento"
		) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING codigo_apolice;`

	var codigo string
	err := db.QueryRow(sqlStatement, a.luc, a.fantasia, a.segmento, a.seguradora, a.vigencia, a.vencimento).Scan(&codigo)
	if err != nil {
		return fmt.Errorf("falha ao inserir: %w", err)
	}
	fmt.Printf("Apólice inserida com o código: %s\n", codigo)
	return nil
}

func listarApolices(db *sql.DB) error {
	rows, err := db.Query(`SELECT codigo_apolice, "luc", "segmento", "vencimento" FROM "Apolices"`)
	if err != nil {
		return fmt.Errorf("falha ao buscar apólices: %w", err)
	}
	defer rows.Close()

	fmt.Println("\n--- LISTA DE APÓLICES ---")
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "CÓDIGO\tluc\tsegmento\tvencimento")
	fmt.Fprintln(w, "------\t-------\t----------\t------")

	count := 0
	for rows.Next() {
		var codigo, luc, segmento, vencimento string
		if err := rows.Scan(&codigo, &luc, &segmento, &vencimento); err != nil {
			return err
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", codigo, luc, segmento, vencimento)
		count++
	}
	w.Flush()

	if count == 0 {
		fmt.Println("Nenhuma apólice cadastrada.")
	} else {
		fmt.Printf("\nTotal: %d apólice(s)\n", count)
	}
	return nil
}

func atualizarApolice(db *sql.DB, codigo string, a Apolice) error {
	sqlStatement := `
		UPDATE "Apolices" 
		SET "luc"=$1, "fantasia"=$2, "segmento"=$3, "seguradora"=$4, "vigencia"=$5, "vencimento"=$6
		WHERE codigo_apolice=$7;`

	res, err := db.Exec(sqlStatement, a.luc, a.fantasia, a.segmento, a.seguradora, a.vigencia, a.vencimento, codigo)
	if err != nil {
		return fmt.Errorf("falha ao atualizar: %w", err)
	}

	linhasAfetadas, _ := res.RowsAffected()
	if linhasAfetadas == 0 {
		fmt.Printf("⚠️ Nenhuma apólice encontrada com o código: %s\n", codigo)
	} else {
		fmt.Println("Apólice atualizada com sucesso!")
	}
	return nil
}

func deletarApolice(db *sql.DB, codigo string) error {
	sqlStatement := `DELETE FROM "Apolices" WHERE codigo_apolice=$1;`

	res, err := db.Exec(sqlStatement, codigo)
	if err != nil {
		return fmt.Errorf("falha ao deletar: %w", err)
	}

	linhasAfetadas, _ := res.RowsAffected()
	if linhasAfetadas == 0 {
		fmt.Printf("⚠️ Nenhuma apólice encontrada com o código: %s\n", codigo)
	} else {
		fmt.Println("Apólice deletada com sucesso!")
	}
	return nil
}

func main() {
	connStr := "user=postgres password=postgres dbname=postgres host=localhost port=5432 sslmode=disable"

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Erro ao configurar conexão com o banco: %v\n", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Erro ao conectar fisicamente ao banco: %v\n", err)
	}

	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("\n\n\n")
		fmt.Println(strings.Repeat("=", 40))
		fmt.Println("   GERENCIADOR DE APÓLICES (CRUD)")
		fmt.Println(strings.Repeat("=", 40))
		fmt.Println("1. Criar nova apólice (Create)")
		fmt.Println("2. Listar apólices (Read)")
		fmt.Println("3. Atualizar apólice (Update)")
		fmt.Println("4. Deletar apólice (Delete)")
		fmt.Println("0. Sair")
		fmt.Println(strings.Repeat("-", 40))

		opcao := lerEntrada("Escolha uma opção: ", reader)

		switch opcao {
		case "1":
			fmt.Println("\n--- NOVA APÓLICE ---")
			novaApolice := Apolice{
				luc:        lerEntrada("luc: ", reader),
				fantasia:   lerEntrada("fantasia: ", reader),
				segmento:   lerEntrada("segmento: ", reader),
				seguradora: lerEntrada("Vigência (YYYY-MM-DD): ", reader),
				vigencia:   lerEntrada("vigencia (YYYY-MM-DD): ", reader),
				vencimento: lerEntrada("vencimento (Ativa/Vencida/A Vencer): ", reader),
			}
			if err := inserirApolice(db, novaApolice); err != nil {
				log.Println(err)
			}
			pause(reader)

		case "2":
			if err := listarApolices(db); err != nil {
				log.Println(err)
			}
			pause(reader)

		case "3":
			fmt.Println("\n--- ATUALIZAR APÓLICE ---")
			codigo := lerEntrada("Digite o CÓDIGO da apólice que deseja alterar: ", reader)
			fmt.Println("Digite os novos dados (ou repita os antigos se não quiser mudar):")

			dadosAtualizados := Apolice{
				luc:        lerEntrada("Novo luc: ", reader),
				fantasia:   lerEntrada("Novo fantasia: ", reader),
				segmento:   lerEntrada("Nova segmento: ", reader),
				seguradora: lerEntrada("Nova Vigência (YYYY-MM-DD): ", reader),
				vigencia:   lerEntrada("Novo vigencia (YYYY-MM-DD): ", reader),
				vencimento: lerEntrada("Novo vencimento: ", reader),
			}
			if err := atualizarApolice(db, codigo, dadosAtualizados); err != nil {
				log.Println(err)
			}
			pause(reader)

		case "4":
			fmt.Println("\n--- DELETAR APÓLICE ---")
			codigo := lerEntrada("Digite o CÓDIGO da apólice a ser deletada: ", reader)
			confirmacao := lerEntrada("Tem certeza? (s/n): ", reader)
			if strings.ToLower(confirmacao) == "s" {
				if err := deletarApolice(db, codigo); err != nil {
					log.Println(err)
				}
			} else {
				fmt.Println("Operação cancelada.")
			}
			pause(reader)

		case "0":
			fmt.Println("\nEncerrando o sistema... Até logo!")
			os.Exit(0)

		default:
			fmt.Println("\n⚠️ Opção inválida. Tente novamente.")
			pause(reader)
		}
	}
}
