package app

import (
	"context"
	"database/sql"
	"grupo4/seguros/internal/ai"
	"grupo4/seguros/internal/apolice"
	"grupo4/seguros/internal/audit"
	"grupo4/seguros/internal/auth"
	"grupo4/seguros/internal/database"
	"grupo4/seguros/internal/middleware"
	"grupo4/seguros/internal/notificacao"
	"grupo4/seguros/internal/relatorio"
	"grupo4/seguros/pkg/config"
	"grupo4/seguros/pkg/response"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func Run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	db, err := database.Connect(cfg.Postgres)
	if err != nil {
		return err
	}
	defer db.Close()

	handler := buildHandler(context.Background(), db, cfg)
	log.Printf("Servidor rodando em http://%s", cfg.Addr())
	return http.ListenAndServe(cfg.Addr(), handler)
}

func buildHandler(ctx context.Context, db *sql.DB, cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Audit log — inicializar antes dos outros pacotes
	auditSvc := audit.RegisterRoutes(mux, db)
	// Cria a tabela se não existir (idempotente)
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS audit_logs (
		id BIGSERIAL PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL DEFAULT 'sistema',
		acao VARCHAR(100) NOT NULL,
		entidade VARCHAR(100) NOT NULL,
		entidade_id VARCHAR(255) NOT NULL DEFAULT '',
		payload_anterior JSONB,
		payload_novo JSONB,
		ip VARCHAR(45) NOT NULL DEFAULT '',
		user_agent TEXT NOT NULL DEFAULT '',
		timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
	); CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_logs (acao);
	CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_logs (entidade);
	CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs (user_id);`); err != nil {
		log.Printf("Aviso: não foi possível criar tabela audit_logs: %v", err)
	} else {
		// Corrige a sequência do ID caso o banco tenha sido populado com IDs manuais
		db.Exec("SELECT setval('audit_logs_id_seq', COALESCE((SELECT MAX(id) FROM audit_logs), 1));")
	}

	// Auth — rotas públicas de login
	auth.RegisterRoutes(mux, db, auditSvc, cfg.JWTSecret, cfg.JWTExpirationHours)

	notificacao.RegisterRoutes(mux, db, cfg.JWTSecret)

	// AI
	aiSvc, err := ai.NewService(context.Background())
	if err != nil {
		log.Printf("Aviso: serviço de IA desabilitado. Motivo: %v", err)
	}

	apolice.RegisterRoutesWithAudit(mux, db, auditSvc, aiSvc, cfg.JWTSecret)
	relatorio.RegisterRoutes(mux, cfg.JWTSecret, cfg.GeminiAPIKey)
	registerStaticFiles(mux, cfg.Frontend.Dir)

	return middleware.Chain(mux,
		middleware.RequestID,
		middleware.Logger,
		middleware.Recover,
		middleware.CORS(cfg.AllowedOrigins),
	)
}

func registerStaticFiles(mux *http.ServeMux, staticPath string) {
	fs := http.FileServer(http.Dir(staticPath))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// As rotas de API continuam respondendo com 404 em vez de carregar a UI
		if strings.HasPrefix(r.URL.Path, "/api/") {
			response.Fail(w, http.StatusNotFound, "Rota não encontrada", middleware.RequestIDFromContext(r.Context()), nil)
			return
		}

		// Para rotas do frontend, tentamos ler o arquivo.
		// Se não existir, retornamos index.html para o React Router assumir.
		path := filepath.Join(staticPath, r.URL.Path)
		info, err := os.Stat(path)

		if os.IsNotExist(err) || info.IsDir() {
			// Arquivo não existe ou é diretório (ex: /seguros), manda o index.html
			http.ServeFile(w, r, filepath.Join(staticPath, "index.html"))
			return
		}

		// Se o arquivo existe (ex: .js, .css, .png), deixa o FileServer servir
		fs.ServeHTTP(w, r)
	})
}
