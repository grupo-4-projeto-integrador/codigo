package apolice

import (
	"database/sql"
	"net/http"
)

func RegisterRoutes(mux *http.ServeMux, db *sql.DB) {
	repo := NewRepository(db)
	service := NewService(repo)
	handler := NewHandler(service)

	mux.HandleFunc("/api/apolices", handler.Collection)
	mux.HandleFunc("/api/fila-de-acao", handler.FilaDeAcao)
	mux.HandleFunc("/api/apolices/", handler.Item("/api/apolices"))
	mux.HandleFunc("/api/map-layout", handler.GetMapLayout)
	mux.HandleFunc("/apolices", handler.Collection)
	mux.HandleFunc("/apolices/", handler.Item("/apolices"))
}
