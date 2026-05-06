package main

import (
	"fmt"
	"log"
	"net/http"
	"database/sql"
	_ "modernc.org/sqlite" // Não esqueça do driver do banco!
)

func main() {
	// --- PARTE DO BANCO (Mantenha isso) ---
	db, _ := sql.Open("sqlite", "./seguros.db")
	db.Exec("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, nome TEXT)")
	db.Close() 

	// --- PARTE DA IMAGEM (Servidor de arquivos) ---
	fileserver := http.FileServer(http.Dir("./static/dist"))

	http.Handle("/", fileserver)

	fmt.Printf("Servidor rodando em http://localhost:8082\n")
	if err := http.ListenAndServe(":8082", nil); err != nil {
		log.Fatal(err)
	}
}
