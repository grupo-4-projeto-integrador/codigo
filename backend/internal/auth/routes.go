package auth

import (
	"database/sql"
	"net/http"

	"grupo4/seguros/internal/audit"
)

// RegisterRoutes registra as rotas públicas de autenticação.
func RegisterRoutes(mux *http.ServeMux, db *sql.DB, auditSvc *audit.Service, secret string, expirationHours int) {
	h := NewHandler(db, auditSvc, secret, expirationHours)

	// POST /api/auth/login — público (sem AuthMiddleware)
	mux.HandleFunc("POST /api/auth/login", h.Login)

	// GET /api/auth/me — requer token válido
	authMW := AuthMiddleware(secret)
	mux.Handle("GET /api/auth/me", authMW(http.HandlerFunc(h.Me)))

	// Administração de Usuários — apenas admin
	requireAdmin := RequireRole(secret, "admin")
	mux.Handle("GET /api/usuarios", requireAdmin(http.HandlerFunc(h.GetUsuarios)))
	mux.Handle("POST /api/usuarios", requireAdmin(http.HandlerFunc(h.CreateUsuario)))
	mux.Handle("PATCH /api/usuarios/{id}", requireAdmin(http.HandlerFunc(h.UpdateUsuario)))
}
