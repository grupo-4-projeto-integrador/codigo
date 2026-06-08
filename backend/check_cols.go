package main

import (
	"fmt"
	"grupo4/seguros/internal/database"
)

func main() {
	db := database.MustConnect()
	defer db.Close()
	rows, err := db.Query("SELECT column_name FROM information_schema.columns WHERE table_name=$1", "seguros")
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	for rows.Next() {
		var col string
		rows.Scan(&col)
		fmt.Println(col)
	}
}
