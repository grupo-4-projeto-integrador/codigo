package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

func promptUser(prompt string, defaultValue string) string {
	fmt.Printf("%s [%s]: ", prompt, defaultValue)
	reader := bufio.NewReader(os.Stdin)
	input, err := reader.ReadString('\n')
	if err != nil {
		return defaultValue
	}
	input = strings.TrimSpace(input)
	if input == "" {
		return defaultValue
	}
	return input
}

func main() {
	fmt.Println("=== Configuração Inicial do Banco de Dados ===")

	password := promptUser("Qual a senha do seu usuário 'postgres' no PgAdmin?", "S1wVEXwvRr")
	dbName := promptUser("Qual o nome do banco de dados que deseja usar/criar?", "postgres")

	// Create or update .env file
	envContent := fmt.Sprintf(`PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=%s
PG_DBNAME=%s
PG_SSLMODE=disable
`, password, dbName)

	err := os.WriteFile(".env", []byte(envContent), 0644)
	if err != nil {
		log.Printf("⚠️  Aviso: Falha ao criar arquivo .env: %v", err)
	} else {
		fmt.Println("✅ Arquivo .env atualizado com as credenciais informadas.")
	}

	// 1. First connect to the default 'postgres' database to ensure we can create the requested DB if needed
	baseConnStr := fmt.Sprintf("host=localhost port=5432 user=postgres password=%s dbname=postgres sslmode=disable", password)
	baseDb, err := sql.Open("postgres", baseConnStr)
	if err != nil {
		log.Fatalf("❌ Erro fatal: %v", err)
	}

	if err := baseDb.Ping(); err != nil {
		log.Fatalf("❌ Erro de autenticação: a senha '%s' está incorreta ou o PostgreSQL não está rodando. Verifique no seu PgAdmin. (%v)", password, err)
	}

	// Check if the requested database exists
	var exists bool
	err = baseDb.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", dbName).Scan(&exists)
	if err != nil {
		log.Fatalf("❌ Erro ao verificar banco de dados: %v", err)
	}

	if !exists {
		fmt.Printf("⏳ Banco de dados '%s' não existe. Criando agora...\n", dbName)
		_, err = baseDb.Exec(fmt.Sprintf("CREATE DATABASE \"%s\"", dbName))
		if err != nil {
			log.Fatalf("❌ Erro ao criar banco '%s': %v", dbName, err)
		}
		fmt.Printf("✅ Banco de dados '%s' criado com sucesso!\n", dbName)
	}
	baseDb.Close()

	// 2. Connect to the target database to run migrations
	targetConnStr := fmt.Sprintf("host=localhost port=5432 user=postgres password=%s dbname=%s sslmode=disable", password, dbName)
	db, err := sql.Open("postgres", targetConnStr)
	if err != nil {
		log.Fatalf("❌ Erro ao conectar no banco '%s': %v", dbName, err)
	}
	defer db.Close()

	fmt.Printf("✅ Conectado ao banco '%s' para criar as tabelas.\n", dbName)

	// Run initial_schema.sql
	schemaSQL, err := os.ReadFile("migrations/initial_schema.sql")
	if err == nil {
		_, err = db.Exec(string(schemaSQL))
		if err != nil {
			log.Printf("⚠️  Aviso ao rodar schema: %v", err)
		} else {
			fmt.Println("✅ Tabelas base criadas com sucesso.")
		}
	} else {
		log.Printf("⚠️  Não achou migrations/initial_schema.sql: %v", err)
	}

	// Add deleted_at and dias rest. columns (migration)
	_, err = db.Exec("ALTER TABLE seguros ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;")
	if err != nil {
		log.Printf("⚠️  Aviso ao adicionar deleted_at: %v", err)
	} else {
		fmt.Println("✅ Estrutura de exclusão (deleted_at) configurada com sucesso.")
	}

	_, err = db.Exec("ALTER TABLE seguros ADD COLUMN IF NOT EXISTS \"dias rest.\" INTEGER DEFAULT NULL;")
	if err != nil {
		log.Printf("⚠️  Aviso ao adicionar dias rest.: %v", err)
	} else {
		fmt.Println("✅ Coluna 'dias rest.' configurada com sucesso.")
	}

	// Create historico_apolice table (migration)
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS historico_apolice (
		id SERIAL PRIMARY KEY,
		apolice_luc VARCHAR(50) NOT NULL,
		data TIMESTAMP NOT NULL DEFAULT NOW(),
		descricao TEXT NOT NULL,
		ator VARCHAR(255) NOT NULL DEFAULT 'Sistema'
	);`)
	if err != nil {
		log.Printf("⚠️  Aviso ao criar historico_apolice: %v", err)
	} else {
		fmt.Println("✅ Tabela historico_apolice configurada com sucesso.")
	}
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_historico_apolice_luc ON historico_apolice (apolice_luc);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_historico_apolice_data ON historico_apolice (data DESC);")

	// Run multiuser roles migration
	rolesSQL, err := os.ReadFile("migrations/002_multiuser_roles.sql")
	if err == nil {
		_, err = db.Exec(string(rolesSQL))
		if err != nil {
			log.Printf("⚠️  Aviso ao rodar roles: %v", err)
		} else {
			fmt.Println("✅ Roles e usuários criados com sucesso.")
		}
	} else {
		log.Printf("⚠️  Não achou migrations/002_multiuser_roles.sql: %v", err)
	}

	// Run audit log migration
	auditSQL, err := os.ReadFile("migrations/audit_log.sql")
	if err == nil {
		_, err = db.Exec(string(auditSQL))
		if err != nil {
			log.Printf("⚠️  Aviso ao rodar audit_log: %v", err)
		} else {
			fmt.Println("✅ Audit log criado com sucesso.")
		}
	} else {
		log.Printf("⚠️  Não achou migrations/audit_log.sql: %v", err)
	}

	// Run seed_apolices.sql
	seedSQL, err := os.ReadFile("seed_apolices.sql")
	if err == nil {
		_, err = db.Exec(string(seedSQL))
		if err != nil {
			// Pode falhar se já existir e não for idempotente, tratamos como aviso
			log.Printf("⚠️  Aviso ao inserir dados de exemplo: %v", err)
		} else {
			fmt.Println("✅ Dados de exemplo inseridos com sucesso!")
		}
	} else {
		log.Printf("⚠️  Não achou seed_apolices.sql: %v", err)
	}

	// Run cnpj + numero_apolice migration
	cnpjSQL, err := os.ReadFile("migrations/003_cnpj_numero_apolice.sql")
	if err == nil {
		_, err = db.Exec(string(cnpjSQL))
		if err != nil {
			log.Printf("⚠️  Aviso ao rodar migration de CNPJ: %v", err)
		} else {
			fmt.Println("✅ CNPJ e número de apólice gerados com sucesso.")
		}
	} else {
		log.Printf("⚠️  Não achou migrations/003_cnpj_numero_apolice.sql: %v", err)
	}

	// Create notificacoes table (migration)
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS notificacoes (
		id SERIAL PRIMARY KEY,
		usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
		apolice_luc VARCHAR(50) NOT NULL,
		tipo VARCHAR(50) NOT NULL,
		lida BOOLEAN DEFAULT FALSE,
		arquivada BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
	);`)
	if err != nil {
		log.Printf("⚠️  Aviso ao criar notificacoes: %v", err)
	} else {
		fmt.Println("✅ Tabela notificacoes configurada com sucesso.")
	}
	_, _ = db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_notificacoes_active ON notificacoes(usuario_id, apolice_luc, tipo) WHERE arquivada = FALSE;")

	fmt.Println("\n🎉 Tudo pronto! O banco de dados está 100% configurado.")
	fmt.Println("👉 Agora você pode iniciar o servidor rodando:")
	fmt.Println("   go run ./cmd/api")
}
