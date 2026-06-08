package notificacao

import (
	"database/sql"
	"net/http"

	"grupo4/seguros/internal/auth"
)

func RegisterRoutes(mux *http.ServeMux, db *sql.DB, jwtSecret string) {
	repo := NewPostgresRepository(db)
	svc := NewService(repo)
	handler := NewHandler(svc)

	// Helper: exige apenas token válido (todos os roles)
	onlyAuth := func(h http.Handler) http.Handler {
		if jwtSecret == "" {
			return h
		}
		return auth.AuthMiddleware(jwtSecret)(h)
	}

	mux.Handle("GET /api/notificacoes", onlyAuth(http.HandlerFunc(handler.GetNotificacoes)))
	mux.Handle("PATCH /api/notificacoes/marcar-lidas", onlyAuth(http.HandlerFunc(handler.MarcarTodasLidas)))
	mux.Handle("DELETE /api/notificacoes/arquivadas", onlyAuth(http.HandlerFunc(handler.ArquivarLidas)))
	mux.Handle("DELETE /api/notificacoes/{id}", onlyAuth(http.HandlerFunc(handler.ArquivarUnica)))
}
