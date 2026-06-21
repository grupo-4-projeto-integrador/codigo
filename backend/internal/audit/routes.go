package audit

import (
	"database/sql"
	"net/http"
)

func RegisterRoutes(mux *http.ServeMux, db *sql.DB) *Service {
	repo := NewRepository(db)
	service := NewService(repo, db)
	handler := NewHandler(service)

	mux.HandleFunc("GET /api/admin/audit", handler.GetLogs)
	mux.HandleFunc("POST /api/admin/audit", handler.LogAction)
	mux.HandleFunc("POST /api/admin/audit/reverter-ultima", handler.ReverterUltima)
	mux.HandleFunc("POST /api/admin/audit/{id}/reverter", handler.ReverterPorID)

	return service // exposto para que outros pacotes possam usar o serviço de auditoria
}
