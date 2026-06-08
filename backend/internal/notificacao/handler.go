package notificacao

import (
	"net/http"
	"strconv"

	"grupo4/seguros/internal/auth"
	"grupo4/seguros/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetNotificacoes(w http.ResponseWriter, r *http.Request) {
	usuarioID := auth.UserIDFromContext(r.Context())
	list, err := h.service.GetNotificacoes(usuarioID)
	if err != nil {
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao buscar notificações", err.Error(), nil)
		return
	}
	_ = response.Success(w, http.StatusOK, list, "")
}

func (h *Handler) MarcarTodasLidas(w http.ResponseWriter, r *http.Request) {
	usuarioID := auth.UserIDFromContext(r.Context())
	if err := h.service.MarcarTodasLidas(usuarioID); err != nil {
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao marcar como lidas", err.Error(), nil)
		return
	}
	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Notificações marcadas como lidas"}, "")
}

func (h *Handler) ArquivarLidas(w http.ResponseWriter, r *http.Request) {
	usuarioID := auth.UserIDFromContext(r.Context())
	if err := h.service.ArquivarLidas(usuarioID); err != nil {
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao arquivar notificações lidas", err.Error(), nil)
		return
	}
	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Notificações lidas foram arquivadas"}, "")
}

func (h *Handler) ArquivarUnica(w http.ResponseWriter, r *http.Request) {
	usuarioID := auth.UserIDFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "ID inválido", "", nil)
		return
	}

	if err := h.service.ArquivarUnica(usuarioID, id); err != nil {
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao arquivar notificação", err.Error(), nil)
		return
	}
	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Notificação arquivada"}, "")
}
