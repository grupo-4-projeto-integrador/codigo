package app

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"grupo4/seguros/internal/apolice"
	"grupo4/seguros/internal/audit"
	"grupo4/seguros/internal/auth"
	"grupo4/seguros/internal/database"
	"grupo4/seguros/internal/middleware"
	"grupo4/seguros/internal/notificacao"
	"grupo4/seguros/pkg/config"
	"grupo4/seguros/pkg/response"
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

	handler := buildHandler(db, cfg)
	log.Printf("Servidor rodando em http://%s", cfg.Addr())
	return http.ListenAndServe(cfg.Addr(), handler)
}

func buildHandler(db *sql.DB, cfg config.Config) http.Handler {
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
	}

	// Auth — rotas públicas de login
	auth.RegisterRoutes(mux, db, cfg.JWTSecret)

	notificacao.RegisterRoutes(mux, db, cfg.JWTSecret)

	apolice.RegisterRoutesWithAudit(mux, db, auditSvc, cfg.JWTSecret)
	registerStaticFiles(mux, cfg.Frontend.Dir)

	return middleware.Chain(mux,
		middleware.RequestID,
		middleware.Logger,
		middleware.Recover,
		middleware.CORS,
	)
}

func registerStaticFiles(mux *http.ServeMux, staticPath string) {
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			response.Fail(w, http.StatusNotFound, "Rota não encontrada", middleware.RequestIDFromContext(r.Context()), nil)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>API de Seguros</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #e2e8f0; }
    main { max-width: 720px; padding: 32px; }
    h1 { margin: 0 0 12px; font-size: 2rem; }
    p { line-height: 1.6; margin: 0 0 12px; }
    a { color: #38bdf8; }
    code { background: rgba(148, 163, 184, 0.15); padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>API de Seguros online</h1>
    <p>O backend está funcionando corretamente.</p>
    <p>Acesse o frontend via ambiente de desenvolvimento (pnpm dev).</p>
  </main>
</body>
</html>`))
	})
}
