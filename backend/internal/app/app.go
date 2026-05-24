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

		http.ServeFile(w, r, filepath.Join(staticPath, "index.html"))
	})
}
