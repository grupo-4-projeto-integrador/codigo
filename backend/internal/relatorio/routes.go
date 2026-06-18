package relatorio

import (
	"net/http"

	"grupo4/seguros/internal/auth"
)

// RegisterRoutes registra o endpoint POST /api/relatorio/executivo.
// geminiAPIKey é injetada pelo app.go a partir de config.Config.GeminiAPIKey —
// nunca lida diretamente do ambiente aqui (Vetor 3).
func RegisterRoutes(mux *http.ServeMux, jwtSecret string, geminiAPIKey string) {
	h := NewHandler(geminiAPIKey)

	withAuth := func(handler http.Handler) http.Handler {
		if jwtSecret == "" {
			return handler
		}
		return auth.AuthMiddleware(jwtSecret)(handler)
	}

	mux.Handle("POST /api/relatorio/executivo",
		withAuth(http.HandlerFunc(h.GerarRelatorio)))
}
