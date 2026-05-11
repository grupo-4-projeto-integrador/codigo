package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	_ "github.com/lib/pq" // Driver correto para Postgres
)

func main() {
	// String de conexão: mude 'sua_senha' pela senha do seu Postgres
	connStr := "host=localhost port=5432 user=postgres password=esufg123 dbname=seguros_db sslmode=disable"
	
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Erro no driver:", err)
	}
	defer db.Close()

	// Testa se o banco responde
	if err := db.Ping(); err != nil {
		log.Fatal("Não conectou ao banco. Verifique a senha!", err)
	}
	fmt.Println("Conectado ao PostgreSQL com sucesso!")

	// Seu servidor de arquivos continua igual
	fileserver := http.FileServer(http.Dir("./static/dist"))
	http.Handle("/", fileserver)

	fmt.Println("Servidor rodando em http://localhost:8082")
	log.Fatal(http.ListenAndServe(":8082", nil))
}
