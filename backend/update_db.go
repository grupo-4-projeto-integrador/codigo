package main

import (
	"database/sql"
	"fmt"
	"log"
	"math"

	_ "github.com/lib/pq"
)

func generateCoverageValue(luc string) float64 {
	if luc == "" {
		return 0
	}
	hash := 0
	for i := 0; i < len(luc); i++ {
		hash = int(luc[i]) + ((hash << 5) - hash)
	}
	absoluteHash := hash
	if absoluteHash < 0 {
		absoluteHash = -absoluteHash
	}
	baseValue := 500000 + (absoluteHash % 2500000)
	return math.Round(float64(baseValue)/10000) * 10000
}

func main() {
	connStr := "host=localhost port=5432 user=postgres password=S1wVEXwvRr dbname=postgres sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT luc FROM seguros WHERE cobertura IS NULL OR cobertura = 0")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var lucs []string
	for rows.Next() {
		var luc string
		if err := rows.Scan(&luc); err != nil {
			log.Fatal(err)
		}
		lucs = append(lucs, luc)
	}
	rows.Close()

	updatedCount := 0
	for _, luc := range lucs {
		coverage := generateCoverageValue(luc)
		_, err := db.Exec("UPDATE seguros SET cobertura = $1 WHERE luc = $2", coverage, luc)
		if err != nil {
			log.Printf("Failed to update %s: %v", luc, err)
		} else {
			updatedCount++
		}
	}

	fmt.Printf("Successfully updated %d rows with coverage data.\n", updatedCount)
}
