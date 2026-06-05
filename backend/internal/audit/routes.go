package audit

import (
	"database/sql"
	"net/http"
)

func RegisterRoutes(mux *http.ServeMux, db *sql.DB) *Service {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service)

	mux.HandleFunc("GET /api/admin/audit", handler.GetLogs)
	mux.HandleFunc("POST /api/admin/audit", handler.LogAction)

	return service // exposto para que outros pacotes possam usar o serviço de auditoria
}
