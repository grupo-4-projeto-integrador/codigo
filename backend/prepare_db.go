package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	// Create .env file if it doesn't exist
	envContent := `PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=S1wVEXwvRr
PG_DBNAME=postgres
PG_SSLMODE=disable
`
	if _, err := os.Stat(".env"); os.IsNotExist(err) {
		err := os.WriteFile(".env", []byte(envContent), 0644)
		if err != nil {
			log.Printf("Aviso: Falha ao criar .env: %v", err)
		} else {
			fmt.Println("✅ Arquivo .env criado com as credenciais padrão.")
		}
	} else {
		fmt.Println("✅ Arquivo .env já existe.")
	}

	// Connect to postgres database
	connStr := "host=localhost port=5432 user=postgres password=S1wVEXwvRr dbname=postgres sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("❌ Erro ao conectar no banco: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Erro ao acessar o banco: %v. Verifique se a senha do seu PostgreSQL é 'S1wVEXwvRr'.", err)
	}
	fmt.Println("✅ Conectado ao PostgreSQL com sucesso!")

	// Run initial_schema.sql
	schemaSQL, err := os.ReadFile("migrations/initial_schema.sql")
	if err == nil {
		_, err = db.Exec(string(schemaSQL))
		if err != nil {
			log.Printf("⚠️  Aviso ao rodar schema: %v", err)
		} else {
			fmt.Println("✅ Tabelas base criadas com sucesso (initial_schema.sql).")
		}
	} else {
		log.Printf("⚠️  Não achou migrations/initial_schema.sql: %v", err)
	}

	// Run seed_apolices.sql
	seedSQL, err := os.ReadFile("seed_apolices.sql")
	if err == nil {
		_, err = db.Exec(string(seedSQL))
		if err != nil {
			log.Printf("⚠️  Aviso ao rodar seed: %v", err)
		} else {
			fmt.Println("✅ Dados iniciais inseridos com sucesso (seed_apolices.sql).")
		}
	} else {
		log.Printf("⚠️  Não achou seed_apolices.sql: %v", err)
	}

	// Add deleted_at column
	_, err = db.Exec("ALTER TABLE seguros ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;")
	if err != nil {
		log.Printf("⚠️  Aviso ao adicionar deleted_at: %v", err)
	} else {
		fmt.Println("✅ Coluna 'deleted_at' verificada/adicionada com sucesso.")
	}

	fmt.Println("\n🎉 Banco de dados configurado com sucesso! Agora você pode rodar o backend com:")
	fmt.Println("go run ./cmd/api")
}
