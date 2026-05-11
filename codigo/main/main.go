package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	// O sublinhado (_) importa o pacote apenas por seus efeitos colaterais (registro do driver)
	_ "github.com/lib/pq"
)

// Apolice representa o modelo de dados da nossa tabela
type Apolice struct {
	CodigoApolice string
	Lojista       string
	Tipo          string
	Seguradora    string
	Vigencia      string 
	Vencimento    string
	Status        string
}

// inserirApolice recebe a instância do banco e os dados, executando a inserção segura
func inserirApolice(db *sql.DB, a Apolice) error {
	sqlStatement := `
		INSERT INTO "Apolices" (
			codigo_apolice, 
			"Lojista", 
			"Tipo", 
			"Seguradora", 
			"Vigencia", 
			"Vencimento", 
			"Status"
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING codigo_apolice;`

	var codigoInserido string

	err := db.QueryRow(
		sqlStatement,
		a.CodigoApolice,
		a.Lojista,
		a.Tipo,
		a.Seguradora,
		a.Vigencia,
		a.Vencimento,
		a.Status,
	).Scan(&codigoInserido)

	if err != nil {
		return fmt.Errorf("falha ao executar inserção: %w", err)
	}

	fmt.Printf("✅ Sucesso! Apólice inserida com o código: %s\n", codigoInserido)
	return nil
}

// lerEntrada é uma função auxiliar (Arquitetura limpa) para ler inputs com espaço e limpar o "Enter"
func lerEntrada(mensagem string, reader *bufio.Reader) string {
	fmt.Print(mensagem)
	// Lê tudo até o usuário apertar Enter (\n)
	texto, _ := reader.ReadString('\n')
	// Remove os espaços e quebras de linha (\r\n no Windows, \n no Linux/Mac) das bordas
	return strings.TrimSpace(texto)
}

func main() {
	// 1. Configuração da Conexão
	connStr := "user=postgres password=postgres dbname=postgres host=localhost port=5432 sslmode=disable"

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Erro ao configurar conexão com o banco: %v\n", err)
	}
	defer db.Close() 

	// 2. Teste de Ping
	err = db.Ping()
	if err != nil {
		log.Fatalf("Erro ao conectar fisicamente ao banco: %v\n", err)
	}
	fmt.Println("🔌 Conexão com o PostgreSQL estabelecida.")
	fmt.Println(strings.Repeat("-", 40))
	fmt.Println("   SISTEMA DE CADASTRO DE APÓLICES")
	fmt.Println(strings.Repeat("-", 40))

	// 3. Inicializando o leitor de terminal
	reader := bufio.NewReader(os.Stdin)

	// 4. Coletando os dados dinamicamente do usuário
	codigo := lerEntrada("Digite o código da apólice (ex: GO-2026-1001): ", reader)
	lojista := lerEntrada("Digite o nome do Lojista: ", reader)
	tipo := lerEntrada("Digite o Tipo de seguro: ", reader)
	seguradora := lerEntrada("Digite a Seguradora: ", reader)
	vigencia := lerEntrada("Digite a Vigência (YYYY-MM-DD): ", reader)
	vencimento := lerEntrada("Digite o Vencimento (YYYY-MM-DD): ", reader)
	status := lerEntrada("Digite o Status (Ativa, Vencida, A Vencer): ", reader)

	// 5. Montagem do payload
	novaApolice := Apolice{
		CodigoApolice: codigo,
		Lojista:       lojista,
		Tipo:          tipo,
		Seguradora:    seguradora,
		Vigencia:      vigencia,
		Vencimento:    vencimento,
		Status:        status,
	}

	fmt.Println("\nProcessando...")
	
	// 6. Chamada da função para inserir no banco
	err = inserirApolice(db, novaApolice)
	if err != nil {
		log.Printf("❌ Erro durante a operação: %v\n", err)
	}
}