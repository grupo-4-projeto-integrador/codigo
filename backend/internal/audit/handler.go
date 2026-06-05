package audit

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"grupo4/seguros/internal/middleware"
	"grupo4/seguros/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type ListResponse struct {
	Data  []AuditLog `json:"data"`
	Total int        `json:"total"`
	Limit int        `json:"limit"`
	Page  int        `json:"page"`
}

// GetLogs retorna a lista paginada e filtrada de audit logs.
// GET /api/admin/audit?acao=editar&entidade=apolice&de=2024-01-01&ate=2024-12-31&page=1&limit=50
func (h *Handler) GetLogs(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	filter := ListFilter{
		Acao:       q.Get("acao"),
		Entidade:   q.Get("entidade"),
		EntidadeID: q.Get("entidade_id"),
		UserID:     q.Get("user_id"),
		Limit:      limit,
		Offset:     (page - 1) * limit,
	}

	if de := q.Get("de"); de != "" {
		if t, err := time.Parse("2006-01-02", de); err == nil {
			filter.De = &t
		}
	}
	if ate := q.Get("ate"); ate != "" {
		if t, err := time.Parse("2006-01-02", ate); err == nil {
			// include the full day
			end := t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filter.Ate = &end
		}
	}

	logs, total, err := h.service.List(filter)
	if err != nil {
		_ = response.Fail(w, http.StatusInternalServerError, "Erro ao consultar audit log", requestID, nil)
		return
	}

	_ = response.Success(w, http.StatusOK, ListResponse{
		Data:  logs,
		Total: total,
		Limit: limit,
		Page:  page,
	}, requestID)
}

// LogAction é um endpoint utilitário para o frontend registrar ações como exportar/login.
// POST /api/admin/audit
func (h *Handler) LogAction(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodPost {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	var payload struct {
		Acao       string  `json:"acao"`
		Entidade   string  `json:"entidade"`
		EntidadeID string  `json:"entidade_id"`
		Detalhe    *string `json:"detalhe"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
		return
	}

	h.service.LogFromRequest(r, payload.Acao, payload.Entidade, payload.EntidadeID, nil, payload.Detalhe)
	_ = response.Success(w, http.StatusCreated, map[string]string{"message": "registrado"}, requestID)
}
