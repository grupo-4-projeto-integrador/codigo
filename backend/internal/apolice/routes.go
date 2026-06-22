package apolice

import (
	"database/sql"
	"net/http"

	"grupo4/seguros/internal/ai"
	"grupo4/seguros/internal/audit"
	"grupo4/seguros/internal/auth"
)

// RegisterRoutes mantém compatibilidade retroativa (sem auditoria/auth).
func RegisterRoutes(mux *http.ServeMux, db *sql.DB) {
	RegisterRoutesWithAudit(mux, db, nil, nil, "")
}

// RegisterRoutesWithAudit registra rotas com auditoria e autenticação JWT injetados.
func RegisterRoutesWithAudit(mux *http.ServeMux, db *sql.DB, auditSvc *audit.Service, aiSvc *ai.Service, jwtSecret string) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service, auditSvc, aiSvc)

	// Helper: exige apenas token válido (todos os roles)
	onlyAuth := func(h http.Handler) http.Handler {
		if jwtSecret == "" {
			return h
		}
		return auth.AuthMiddleware(jwtSecret)(h)
	}
	// Helper: exige token + role específico
	requireRole := func(h http.Handler, roles ...string) http.Handler {
		if jwtSecret == "" {
			return h
		}
		return auth.RequireRole(jwtSecret, roles...)(h)
	}

	// ── Rotas de leitura — todos os roles autenticados ──────────────────────────
	mux.Handle("/api/apolices", onlyAuth(http.HandlerFunc(handler.Collection)))
	mux.Handle("/api/fila-de-acao", onlyAuth(http.HandlerFunc(handler.FilaDeAcao)))
	mux.Handle("/api/kpis/history", onlyAuth(http.HandlerFunc(handler.GetKPIHistory)))
	mux.Handle("/api/kpis/expiring-by-week", onlyAuth(http.HandlerFunc(handler.GetExpiringByWeek)))
	mux.Handle("/api/kpis/coverage-history", onlyAuth(http.HandlerFunc(handler.GetCoverageHistory)))
	mux.Handle("/api/kpis/risk-by-segment", onlyAuth(http.HandlerFunc(handler.GetRiskBySegment)))
	mux.Handle("/api/kpis/health-score", onlyAuth(http.HandlerFunc(handler.GetHealthScore)))
	mux.Handle("GET /api/apolices/atividade-recente", onlyAuth(http.HandlerFunc(handler.GetAtividadesRecentes)))
	mux.Handle("GET /api/apolices/exportar", onlyAuth(http.HandlerFunc(handler.Exportar)))
	mux.Handle("GET /api/apolices/search", onlyAuth(http.HandlerFunc(handler.SearchApolices)))
	mux.Handle("/api/apolices/", onlyAuth(http.HandlerFunc(handler.Item("/api/apolices"))))
	mux.Handle("/api/map-layout", onlyAuth(http.HandlerFunc(handler.GetMapLayout)))
	mux.Handle("/api/lojas", onlyAuth(http.HandlerFunc(handler.GetLojas)))

	// Sub-recursos de leitura
	mux.Handle("GET /api/apolices/{id}/coberturas", onlyAuth(http.HandlerFunc(handler.GetCoberturas)))
	mux.Handle("GET /api/apolices/{id}/historico", onlyAuth(http.HandlerFunc(handler.GetHistorico)))
	mux.Handle("GET /api/apolices/{id}/documentos", onlyAuth(http.HandlerFunc(handler.GetDocumentos)))
	mux.Handle("GET /api/documentos/{id}/download", onlyAuth(http.HandlerFunc(handler.DownloadDocumento)))
	mux.Handle("GET /api/apolices/{id}/documentos/{docId}/download", onlyAuth(http.HandlerFunc(handler.DownloadDocumento)))

	// Retrocompatibilidade sem prefixo /api/ (sem auth para não quebrar scripts legados)
	mux.HandleFunc("/apolices", handler.Collection)
	mux.HandleFunc("/apolices/", handler.Item("/apolices"))

	// ── Escrita — admin e gestor ────────────────────────────────────────────────
	mux.Handle("POST /api/apolices", requireRole(http.HandlerFunc(handler.Collection), "admin", "gestor"))
	mux.Handle("PUT /api/apolices/{id}", requireRole(http.HandlerFunc(handler.Item("/api/apolices")), "admin", "gestor"))
	mux.Handle("PATCH /api/apolices/{id}", requireRole(http.HandlerFunc(handler.Item("/api/apolices")), "admin", "gestor"))
	mux.Handle("PATCH /api/apolices/{id}/observacoes", requireRole(http.HandlerFunc(handler.UpdateObservacoes), "admin", "gestor"))
	mux.Handle("PATCH /api/apolices/{id}/responsavel", requireRole(http.HandlerFunc(handler.UpdateApoliceResponsavel), "admin", "gestor"))
	mux.Handle("POST /api/apolices/{id}/renovar", requireRole(http.HandlerFunc(handler.RenovarApolice), "admin", "gestor"))
	mux.Handle("POST /api/apolices/{id}/documentos", requireRole(http.HandlerFunc(handler.UploadDocumento), "admin", "gestor"))
	mux.Handle("POST /api/apolices/extract-ai", requireRole(http.HandlerFunc(handler.ExtrairDeDocumento), "admin", "gestor"))

	// ── Exclusão — somente admin ────────────────────────────────────────────────
	mux.Handle("DELETE /api/apolices/{id}", requireRole(http.HandlerFunc(handler.Item("/api/apolices")), "admin"))
	mux.Handle("DELETE /api/documentos/{id}", requireRole(http.HandlerFunc(handler.DeleteDocumento), "admin", "gestor"))

	// Audit logs — protegida pelo pacote audit via RequireRole injetado no app.go
}
