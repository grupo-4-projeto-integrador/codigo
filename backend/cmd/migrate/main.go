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
	seedFile := flag.String("seed-file", "migrations/seed_290_apolices.sql", "Main SQL dump to import into seguros")
	extraSeedFile := flag.String("extra-seed-file", "seed_apolices.sql", "Additional seed script for coberturas and historico_apolice")
	flag.Parse()

	db := database.MustConnect()
	defer db.Close()

	migrations := []string{
		"initial_schema.sql",
		"audit_log.sql",
		"add_responsavel.sql",
		"002_multiuser_roles.sql",
		"003_cnpj_numero_apolice.sql",
		"004_coberturas_notificacoes.sql",
	}

	for _, mig := range migrations {
		migPath := filepath.Join("migrations", mig)
		fmt.Println("Aplicando migration:", migPath)
		if err := runSQLFile(db, migPath); err != nil {
			log.Fatalf("falha ao aplicar migration %s: %v", migPath, err)
		}
		fmt.Println("Migration aplicada com sucesso:", migPath)
	}

	if *withSeed {
		seedPath := filepath.Clean(*seedFile)
		fmt.Println("Importando seed principal:", seedPath)
		if err := runSQLFile(db, seedPath); err != nil {
			log.Fatalf("falha ao importar seed principal: %v", err)
		}
		fmt.Println("Seed principal importada com sucesso")

		extraPath := filepath.Clean(*extraSeedFile)
		fmt.Println("Importando seed complementar:", extraPath)
		if err := runSQLFile(db, extraPath); err != nil {
			log.Fatalf("falha ao importar seed complementar: %v", err)
		}
		fmt.Println("Seed complementar importada com sucesso")
	}
}

func runSQLFile(db *sql.DB, path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	if _, err := db.Exec(string(content)); err != nil {
		return err
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

	if _, err = tx.Exec(`TRUNCATE TABLE seguros RESTART IDENTITY CASCADE`); err != nil {
		return err
	}

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if strings.HasPrefix(scanner.Text(), "COPY public.new ") || strings.HasPrefix(scanner.Text(), "COPY seguros ") {
			break
		}
	}
	if err = scanner.Err(); err != nil {
		return err
	}

	const insertStmt = `INSERT INTO seguros (luc, loja, segmento, seguradora, vigencia, vencimento, status)
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
