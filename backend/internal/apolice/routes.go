package apolice

import (
	"database/sql"
	"net/http"

	"grupo4/seguros/internal/audit"
)

// RegisterRoutes mantém compatibilidade retroativa (sem auditoria).
func RegisterRoutes(mux *http.ServeMux, db *sql.DB) {
	RegisterRoutesWithAudit(mux, db, nil)
}

// RegisterRoutesWithAudit registra rotas com o serviço de auditoria injetado.
func RegisterRoutesWithAudit(mux *http.ServeMux, db *sql.DB, auditSvc *audit.Service) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service, auditSvc)

	mux.HandleFunc("/api/apolices", handler.Collection)
	mux.HandleFunc("/api/fila-de-acao", handler.FilaDeAcao)
	mux.HandleFunc("/api/kpis/history", handler.GetKPIHistory)
	mux.HandleFunc("/api/kpis/expiring-by-week", handler.GetExpiringByWeek)
	mux.HandleFunc("/api/kpis/coverage-history", handler.GetCoverageHistory)
	mux.HandleFunc("/api/kpis/risk-by-segment", handler.GetRiskBySegment)
	mux.HandleFunc("GET /api/apolices/atividade-recente", handler.GetAtividadesRecentes)
	mux.HandleFunc("/api/apolices/", handler.Item("/api/apolices"))
	mux.HandleFunc("/api/map-layout", handler.GetMapLayout)
	mux.HandleFunc("/apolices", handler.Collection)
	mux.HandleFunc("/apolices/", handler.Item("/apolices"))

	mux.HandleFunc("GET /api/apolices/{id}/coberturas", handler.GetCoberturas)
	mux.HandleFunc("GET /api/apolices/{id}/historico", handler.GetHistorico)
	mux.HandleFunc("PATCH /api/apolices/{id}/observacoes", handler.UpdateObservacoes)
	mux.HandleFunc("POST /api/apolices/{id}/renovar", handler.RenovarApolice)
	mux.HandleFunc("GET /api/lojas", handler.GetLojas)

	mux.HandleFunc("GET /api/documentos/{id}/download", handler.DownloadDocumento)
	mux.HandleFunc("GET /api/apolices/{id}/documentos", handler.GetDocumentos)
	mux.HandleFunc("POST /api/apolices/{id}/documentos", handler.UploadDocumento)
}
