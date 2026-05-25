package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
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

	// 1. Define a pasta dos arquivos estáticos
	staticDir := "./static/dist"

	// 2. Cria um manipulador customizado para interceptar as rotas e evitar o 404
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Caminho completo do arquivo solicitado
		path := filepath.Join(staticDir, r.URL.Path)

		// Verifica se o arquivo físico (como .js, .css, imagens) realmente existe
		fi, err := os.Stat(path)
		
		// Se o arquivo não existir ou for uma pasta (como /seguros), entrega o index.html pro React resolver
		if os.IsNotExist(err) || fi.IsDir() {
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
			return
		}

		// Se o arquivo físico existir (ex: index-D_Y8AA6w.js), entrega o arquivo original
		http.FileServer(http.Dir(staticDir)).ServeHTTP(w, r)
	})

	fmt.Println("Servidor rodando em http://localhost:8082")
	log.Fatal(http.ListenAndServe(":8082", nil))
}
