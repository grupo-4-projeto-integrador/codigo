package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
	"log"
	"os"
)

func main() {
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	rows, err := db.Query(`SELECT luc, loja, cnpj FROM seguros LIMIT 5;`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()
	count := 0
	for rows.Next() {
		var l, lo, c sql.NullString
		rows.Scan(&l, &lo, &c)
		fmt.Printf("LUC: %v, Loja: %v, CNPJ: %v\n", l.String, lo.String, c.String)
		count++
	}
	fmt.Printf("Total lido: %d\n", count)
}
