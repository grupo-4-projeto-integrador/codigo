package app

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"grupo4/seguros/internal/apolice"
	"grupo4/seguros/internal/database"
	"grupo4/seguros/internal/middleware"
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
	log.Printf("Servidor rodando em http://localhost%s", cfg.Addr())
	return http.ListenAndServe(cfg.Addr(), handler)
}

func buildHandler(db *sql.DB, cfg config.Config) http.Handler {
	mux := http.NewServeMux()
	
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	
	apolice.RegisterRoutes(mux, db)
	registerStaticFiles(mux, cfg.Frontend.Dir)

	return middleware.Chain(mux,
		middleware.RequestID,
		middleware.Logger,
		middleware.Recover,
		middleware.CORS,
	)
}

func registerStaticFiles(mux *http.ServeMux, staticPath string) {
	if staticPath == "" {
		staticPath = filepath.Join("..", "frontend", "dist")
	}

	fs := http.FileServer(http.Dir(staticPath))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			response.Fail(w, http.StatusNotFound, "Rota não encontrada", middleware.RequestIDFromContext(r.Context()), nil)
			return
		}

		p := filepath.Join(staticPath, r.URL.Path)
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}

		if r.URL.Path == "/" {
			if _, err := os.Stat(filepath.Join(staticPath, "index.html")); err == nil {
				http.ServeFile(w, r, filepath.Join(staticPath, "index.html"))
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
    <p>O backend está funcionando corretamente em <code>/</code>.</p>
    <p>Verifique a saúde em <a href="/api/health">/api/health</a> ou abra o frontend em <a href="http://localhost">http://localhost</a> quando o ambiente estiver via Docker.</p>
    <p>Se estiver rodando só o backend, use as rotas <code>/api/*</code>.</p>
  </main>
</body>
</html>`))
			return
		}
	})
}
