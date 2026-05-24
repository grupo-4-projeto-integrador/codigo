package database

import (
	"database/sql"
	"fmt"
	"log"

	"grupo4/seguros/pkg/config"

	_ "github.com/lib/pq"
)

func Connect(cfg config.PostgresConfig) (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("erro no driver: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("não conectou ao banco: %w", err)
	}

	fmt.Printf("Conectado ao PostgreSQL (host=%s dbname=%s)\n", cfg.Host, cfg.DBName)
	return db, nil
}

func MustConnect() *sql.DB {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := Connect(cfg.Postgres)
	if err != nil {
		log.Fatal(err)
	}
	return db
}
