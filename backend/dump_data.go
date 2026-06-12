package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgres://postgres:S1wVEXwvRr@localhost:5432/postgres?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	file, err := os.Create("migrations/init/03_seed_data.sql")
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	tables := []string{"usuarios", "seguros", "documentos", "historico_apolice", "coberturas"}

	for _, table := range tables {
		rows, err := db.Query("SELECT * FROM " + table)
		if err != nil {
			log.Printf("Error querying table %s: %v", table, err)
			continue
		}
		
		cols, _ := rows.Columns()
		
		for rows.Next() {
			vals := make([]interface{}, len(cols))
			valPtrs := make([]interface{}, len(cols))
			for i := range cols {
				valPtrs[i] = &vals[i]
			}
			if err := rows.Scan(valPtrs...); err != nil {
				log.Fatal(err)
			}
			
			var valsStr []string
			for _, val := range vals {
				if val == nil {
					valsStr = append(valsStr, "NULL")
				} else {
					switch v := val.(type) {
					case []byte:
						valsStr = append(valsStr, fmt.Sprintf("'%s'", strings.ReplaceAll(string(v), "'", "''")))
					case string:
						valsStr = append(valsStr, fmt.Sprintf("'%s'", strings.ReplaceAll(v, "'", "''")))
					default:
						valsStr = append(valsStr, fmt.Sprintf("'%v'", v))
					}
				}
			}
			
			insertQuery := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) ON CONFLICT DO NOTHING;\n", table, strings.Join(cols, ", "), strings.Join(valsStr, ", "))
			file.WriteString(insertQuery)
		}
		rows.Close()
	}
	fmt.Println("Dumped data successfully")
}
