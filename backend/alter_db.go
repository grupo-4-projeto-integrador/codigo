package main

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "host=localhost user=postgres password=S1wVEXwvRr dbname=postgres sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec("ALTER TABLE seguros ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Coluna deleted_at adicionada com sucesso.")
}
