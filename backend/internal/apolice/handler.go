package apolice

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"grupo4/seguros/internal/middleware"
	"grupo4/seguros/pkg/response"
)

type Handler struct {
	service *Service
}

type MapLayoutItem struct {
	Luc      string `json:"luc"`
	Floor    int    `json:"floor"`
	Position int    `json:"position"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetMapLayout(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	mapLayoutPath, err := resolveMapLayoutPath()
	if err != nil {
		_ = response.Fail(w, http.StatusInternalServerError, "Falha ao localizar o layout do mapa", requestID, nil)
		return
	}

	content, err := os.ReadFile(mapLayoutPath)
	if err != nil {
		_ = response.Fail(w, http.StatusInternalServerError, "Falha ao ler o layout do mapa", requestID, nil)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(content)
}

func resolveMapLayoutPath() (string, error) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("não foi possível resolver o caminho do arquivo")
	}

	baseDir := filepath.Dir(currentFile)
	return filepath.Clean(filepath.Join(baseDir, "..", "..", "pkg", "mapconfig", "map_config.json")), nil
}

func (h *Handler) Collection(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	switch r.Method {
	case http.MethodGet:
		items, err := h.service.List()
		if err != nil {
			h.writeError(w, requestID, err)
			return
		}

		responses := make([]Response, 0, len(items))
		for _, item := range items {
			responses = append(responses, ToResponse(item))
		}
		_ = response.Success(w, http.StatusOK, responses, requestID)

	case http.MethodPost:
		payload, err := decodePayload(r)
		if err != nil {
			_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
			return
		}

		item, err := h.service.Create(payload)
		if err != nil {
			h.writeError(w, requestID, err)
			return
		}

		_ = response.Success(w, http.StatusCreated, ToResponse(item), requestID)

	default:
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
	}
}

func (h *Handler) Item(routePrefix string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		requestID := middleware.RequestIDFromContext(r.Context())

		requestedPath := strings.TrimSuffix(r.URL.Path, "/")
		normalizedPrefix := strings.TrimSuffix(routePrefix, "/")
		itemID := strings.TrimPrefix(requestedPath, normalizedPrefix)
		itemID = strings.TrimPrefix(itemID, "/")
		if itemID == "" {
			_ = response.Fail(w, http.StatusBadRequest, "Informe o LUC da apólice na URL", requestID, nil)
			return
		}

		switch r.Method {
		case http.MethodGet:
			item, err := h.service.Get(itemID)
			if err != nil {
				h.writeError(w, requestID, err)
				return
			}
			_ = response.Success(w, http.StatusOK, ToResponse(item), requestID)

		case http.MethodPut:
			payload, err := decodePayload(r)
			if err != nil {
				_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
				return
			}

			item, err := h.service.Update(itemID, payload)
			if err != nil {
				h.writeError(w, requestID, err)
				return
			}
			_ = response.Success(w, http.StatusOK, ToResponse(item), requestID)

		case http.MethodDelete:
			if err := h.service.Delete(itemID); err != nil {
				h.writeError(w, requestID, err)
				return
			}
			_ = response.Success(w, http.StatusOK, map[string]string{"message": "Apólice excluída com sucesso"}, requestID)

		default:
			_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		}
	}
}

func (h *Handler) writeError(w http.ResponseWriter, requestID string, err error) {
	var validationErr ValidationError
	switch {
	case errors.As(err, &validationErr):
		_ = response.Fail(w, http.StatusBadRequest, validationErr.Error(), requestID, nil)
	case errors.Is(err, ErrNotFound):
		_ = response.Fail(w, http.StatusNotFound, ErrNotFound.Error(), requestID, nil)
	default:
		_ = response.Fail(w, http.StatusInternalServerError, err.Error(), requestID, nil)
	}
}

func decodePayload(r *http.Request) (Payload, error) {
	var payload Payload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return payload, err
	}

	payload.Luc = strings.TrimSpace(payload.Luc)
	payload.Loja = strings.TrimSpace(payload.Loja)
	payload.Segmento = strings.TrimSpace(payload.Segmento)
	payload.Seguradora = strings.TrimSpace(payload.Seguradora)
	payload.Vigencia = strings.TrimSpace(payload.Vigencia)
	payload.Vencimento = strings.TrimSpace(payload.Vencimento)

	return payload, nil
}
