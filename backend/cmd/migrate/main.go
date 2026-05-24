package main

import (
	"bufio"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"grupo4/seguros/internal/database"
)

func main() {
	withSeed := flag.Bool("seed", false, "Import seed data after applying migrations")
	flag.Parse()

	db := database.MustConnect()
	defer db.Close()

	migPath := filepath.Join("migrations", "initial_schema.sql")
	fmt.Println("Aplicando migration:", migPath)
	if err := runSQLFile(db, migPath); err != nil {
		log.Fatalf("falha ao aplicar migration: %v", err)
	}
	fmt.Println("Migration aplicada com sucesso")

	if *withSeed {
		seedPath := filepath.Join("..", "seguros-app", "seguros.sql")
		fmt.Println("Importando seed:", seedPath)
		if err := importSeedDump(db, seedPath); err != nil {
			log.Fatalf("falha ao importar seed: %v", err)
		}
		fmt.Println("Seed importada com sucesso")
	}
}

func runSQLFile(db *sql.DB, path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	stmts := strings.Split(string(content), ";")
	for _, s := range stmts {
		stmt := strings.TrimSpace(s)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	return nil
}

func importSeedDump(db *sql.DB, path string) (err error) {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.Exec(`TRUNCATE TABLE public.new`); err != nil {
		return err
	}

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if strings.HasPrefix(scanner.Text(), "COPY public.new ") {
			break
		}
	}
	if err = scanner.Err(); err != nil {
		return err
	}

	const insertStmt = `INSERT INTO public.new (luc, fantasia, segmento, seguradora, vigencia, vencimento, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`

	for scanner.Scan() {
		line := scanner.Text()
		if line == `\.` {
			break
		}
		if strings.TrimSpace(line) == "" {
			continue
		}

		fields := strings.Split(line, "\t")
		if len(fields) != 7 {
			return fmt.Errorf("linha de seed inválida: %q", line)
		}

		vigencia, err := parseSeedDate(fields[4])
		if err != nil {
			return fmt.Errorf("vigencia inválida para %s: %w", fields[0], err)
		}
		vencimento, err := parseSeedDate(fields[5])
		if err != nil {
			return fmt.Errorf("vencimento inválida para %s: %w", fields[0], err)
		}

		if _, err = tx.Exec(insertStmt,
			fields[0],
			fields[1],
			fields[2],
			fields[3],
			vigencia,
			vencimento,
			fields[6],
		); err != nil {
			return err
		}
	}
	if err = scanner.Err(); err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func parseSeedDate(value string) (sql.NullTime, error) {
	if strings.TrimSpace(value) == "" || value == `\N` {
		return sql.NullTime{}, nil
	}

	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return sql.NullTime{}, err
	}

	return sql.NullTime{Time: parsed, Valid: true}, nil
}
