package apolice

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"

	"grupo4/seguros/internal/audit"
	"grupo4/seguros/internal/middleware"
	"grupo4/seguros/pkg/response"
)

type Handler struct {
	service  *Service
	auditSvc *audit.Service // nullable — auditoria opcional
}

type MapLayoutItem struct {
	Luc      string `json:"luc"`
	Floor    int    `json:"floor"`
	Position int    `json:"position"`
}

type KPIHistoryPoint struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type KPIHistoryResponse struct {
	Metric              string            `json:"metric"`
	Total               int               `json:"total"`
	Current             int               `json:"current"`
	WeeklyChangePercent int               `json:"weekly_change_percent"`
	Points              []KPIHistoryPoint `json:"points"`
}

type CoverageHistoryResponse struct {
	Disponivel []float64 `json:"disponivel"`
	Pago       []float64 `json:"pago"`
}

type SegmentRiskItem struct {
	Segmento        string `json:"segmento"`
	Vencidas        int    `json:"vencidas"`
	DiasMedioAtraso int    `json:"dias_medio_atraso"`
}

type HealthScoreResponse struct {
	Score int `json:"score"`
	Delta int `json:"delta"`
}

type AtividadeRecenteResponse struct {
	ID          string    `json:"id"`
	Luc         string    `json:"luc"`
	NomeLoja    string    `json:"nome_loja"`
	Acao        string    `json:"acao"`
	Responsavel string    `json:"responsavel"`
	Timestamp   time.Time `json:"timestamp"`
}

func NewHandler(service *Service, auditSvc *audit.Service) *Handler {
	return &Handler{service: service, auditSvc: auditSvc}
}

// logAudit envia registro de auditoria de forma segura (nunca bloqueia/falha).
func (h *Handler) logAudit(r *http.Request, acao, entidade, entidadeID string, anterior, novo *string) {
	if h.auditSvc != nil {
		h.auditSvc.LogFromRequest(r, acao, entidade, entidadeID, anterior, novo)
	}
}

func (h *Handler) GetMapLayout(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
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

func (h *Handler) GetLojas(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	items, err := h.service.GetLojas()
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	_ = response.Success(w, http.StatusOK, items, requestID)
}

func (h *Handler) GetKPIHistory(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	metric := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("metric")))
	if metric == "" {
		metric = "conformes"
	}
	if metric != "conformes" && metric != "vencidas" {
		_ = response.Fail(w, http.StatusBadRequest, "MÃƒÂ©trica nÃƒÂ£o suportada", requestID, nil)
		return
	}

	weeks := 8
	if rawWeeks := strings.TrimSpace(r.URL.Query().Get("weeks")); rawWeeks != "" {
		parsedWeeks, err := strconv.Atoi(rawWeeks)
		if err != nil || parsedWeeks < 1 {
			_ = response.Fail(w, http.StatusBadRequest, "ParÃƒÂ¢metro weeks invÃƒÂ¡lido", requestID, nil)
			return
		}
		if parsedWeeks > 52 {
			parsedWeeks = 52
		}
		weeks = parsedWeeks
	}

	items, err := h.service.List()
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	points := buildKPIHistoryPoints(items, weeks, metric)
	current := 0
	if len(points) > 0 {
		current = points[len(points)-1].Value
	}
	previous := 0
	if len(points) > 1 {
		previous = points[len(points)-2].Value
	}
	weeklyChangePercent := 0
	if previous > 0 {
		weeklyChangePercent = int(math.Round((float64(current-previous) / float64(previous)) * 100))
	}

	payload := KPIHistoryResponse{
		Metric:              metric,
		Total:               len(items),
		Current:             current,
		WeeklyChangePercent: weeklyChangePercent,
		Points:              points,
	}

	_ = response.Success(w, http.StatusOK, payload, requestID)
}

func (h *Handler) GetExpiringByWeek(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	items, err := h.service.List()
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	weeks := make([]int, 4)
	for _, item := range items {
		if item.Vencimento.IsZero() {
			continue
		}

		daysRemaining := calculateDaysRemaining(item.Vencimento)
		switch {
		case daysRemaining >= 0 && daysRemaining <= 6:
			weeks[0]++
		case daysRemaining >= 7 && daysRemaining <= 13:
			weeks[1]++
		case daysRemaining >= 14 && daysRemaining <= 20:
			weeks[2]++
		case daysRemaining >= 21 && daysRemaining <= 30:
			weeks[3]++
		}
	}

	_ = response.Success(w, http.StatusOK, weeks, requestID)
}

func (h *Handler) GetCoverageHistory(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	weeks := 8
	if rawWeeks := strings.TrimSpace(r.URL.Query().Get("weeks")); rawWeeks != "" {
		parsedWeeks, err := strconv.Atoi(rawWeeks)
		if err != nil || parsedWeeks < 1 {
			_ = response.Fail(w, http.StatusBadRequest, "ParÃƒÂ¢metro weeks invÃƒÂ¡lido", requestID, nil)
			return
		}
		if parsedWeeks > 52 {
			parsedWeeks = 52
		}
		weeks = parsedWeeks
	}

	items, err := h.service.List()
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	disponivel := make([]float64, 0, weeks)
	pago := make([]float64, 0, weeks)

	for i := weeks - 1; i >= 0; i-- {
		snapshot := today.AddDate(0, 0, -7*i)
		var availableValue float64
		var paidValue float64

		for _, item := range items {
			if item.Vigencia.IsZero() || item.Vencimento.IsZero() {
				continue
			}

			vigencia := time.Date(item.Vigencia.Year(), item.Vigencia.Month(), item.Vigencia.Day(), 0, 0, 0, 0, atLocation(snapshot))
			vencimento := time.Date(item.Vencimento.Year(), item.Vencimento.Month(), item.Vencimento.Day(), 0, 0, 0, 0, atLocation(snapshot))

			if snapshot.Before(vigencia) {
				continue
			}

			if snapshot.Before(vencimento) {
				availableValue += item.Cobertura
			} else {
				paidValue += item.Cobertura
			}
		}

		disponivel = append(disponivel, availableValue)
		pago = append(pago, paidValue)
	}

	_ = response.Success(w, http.StatusOK, CoverageHistoryResponse{Disponivel: disponivel, Pago: pago}, requestID)
}

func (h *Handler) GetRiskBySegment(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	items, err := h.service.List()
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	type riskAccumulator struct {
		vencidas    int
		totalAtraso int
	}

	accBySegment := make(map[string]riskAccumulator)
	for _, item := range items {
		segmento := strings.TrimSpace(item.Segmento)
		if segmento == "" {
			segmento = "NÃƒÂ£o informado"
		}

		daysRemaining := calculateDaysRemaining(item.Vencimento)
		if daysRemaining >= 0 {
			continue
		}

		acc := accBySegment[segmento]
		acc.vencidas++
		acc.totalAtraso += -daysRemaining
		accBySegment[segmento] = acc
	}

	result := make([]SegmentRiskItem, 0, len(accBySegment))
	for segmento, acc := range accBySegment {
		mediaAtraso := 0
		if acc.vencidas > 0 {
			mediaAtraso = int(math.Round(float64(acc.totalAtraso) / float64(acc.vencidas)))
		}

		result = append(result, SegmentRiskItem{
			Segmento:        segmento,
			Vencidas:        acc.vencidas,
			DiasMedioAtraso: mediaAtraso,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Vencidas == result[j].Vencidas {
			return strings.ToLower(result[i].Segmento) < strings.ToLower(result[j].Segmento)
		}
		return result[i].Vencidas > result[j].Vencidas
	})

	_ = response.Success(w, http.StatusOK, result, requestID)
}

func (h *Handler) GetHealthScore(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	items, err := h.service.List()
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	score := calculateHealthScore(items, time.Now())
	previousScore := calculateHealthScore(items, time.Now().AddDate(0, 0, -7))

	payload := HealthScoreResponse{
		Score: score,
		Delta: score - previousScore,
	}

	_ = response.Success(w, http.StatusOK, payload, requestID)
}

func calculateHealthScore(items []Apolice, at time.Time) int {
	if len(items) == 0 {
		return 100
	}

	snapshot := time.Date(at.Year(), at.Month(), at.Day(), 0, 0, 0, 0, at.Location())

	conformes := 0
	aVencer := 0
	vencidas := 0

	for _, item := range items {
		if item.Vencimento.IsZero() {
			continue
		}
		if !item.Vigencia.IsZero() {
			vigencia := time.Date(item.Vigencia.Year(), item.Vigencia.Month(), item.Vigencia.Day(), 0, 0, 0, 0, at.Location())
			if snapshot.Before(vigencia) {
				continue
			}
		}

		vencimento := time.Date(item.Vencimento.Year(), item.Vencimento.Month(), item.Vencimento.Day(), 0, 0, 0, 0, at.Location())
		daysRemaining := int(vencimento.Sub(snapshot).Hours() / 24)

		if daysRemaining < 0 {
			vencidas++
		} else if daysRemaining <= 30 {
			aVencer++
		} else {
			conformes++
		}
	}

	total := len(items)
	rawScore := (float64(conformes) * 1.0) + (float64(aVencer) * 0.4) - (float64(vencidas) * 1.5)

	percentage := (rawScore / float64(total)) * 100
	return int(math.Round(math.Max(0, math.Min(100, percentage))))
}

func atLocation(t time.Time) *time.Location {
	return t.Location()
}

func buildKPIHistoryPoints(items []Apolice, weeks int, metric string) []KPIHistoryPoint {
	points := make([]KPIHistoryPoint, 0, weeks)
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	for i := weeks - 1; i >= 0; i-- {
		snapshot := today.AddDate(0, 0, -7*i)
		var value int
		switch metric {
		case "vencidas":
			value = countVencidasAt(items, snapshot)
		default:
			value = countConformesAt(items, snapshot)
		}
		points = append(points, KPIHistoryPoint{
			Label: snapshot.Format("02/01"),
			Value: value,
		})
	}

	return points
}

func countConformesAt(items []Apolice, at time.Time) int {
	count := 0
	snapshot := time.Date(at.Year(), at.Month(), at.Day(), 0, 0, 0, 0, at.Location())

	for _, item := range items {
		if item.Vigencia.IsZero() || item.Vencimento.IsZero() {
			continue
		}

		vigencia := time.Date(item.Vigencia.Year(), item.Vigencia.Month(), item.Vigencia.Day(), 0, 0, 0, 0, at.Location())
		vencimento := time.Date(item.Vencimento.Year(), item.Vencimento.Month(), item.Vencimento.Day(), 0, 0, 0, 0, at.Location())

		if snapshot.Before(vigencia) {
			continue
		}

		daysRemaining := int(vencimento.Sub(snapshot).Hours() / 24)
		if daysRemaining > 30 {
			count++
		}
	}

	return count
}

func countVencidasAt(items []Apolice, at time.Time) int {
	count := 0
	snapshot := time.Date(at.Year(), at.Month(), at.Day(), 0, 0, 0, 0, at.Location())

	for _, item := range items {
		if item.Vencimento.IsZero() {
			continue
		}

		vencimento := time.Date(item.Vencimento.Year(), item.Vencimento.Month(), item.Vencimento.Day(), 0, 0, 0, 0, at.Location())
		if vencimento.Before(snapshot) {
			count++
		}
	}

	return count
}

func resolveMapLayoutPath() (string, error) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("nÃƒÂ£o foi possÃƒÂ­vel resolver o caminho do arquivo")
	}

	baseDir := filepath.Dir(currentFile)
	return filepath.Clean(filepath.Join(baseDir, "..", "..", "pkg", "mapconfig", "map_config.json")), nil
}

func (h *Handler) FilaDeAcao(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	items, err := h.service.GetFilaDeAcao()
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	responses := make([]Response, 0, len(items))
	for _, item := range items {
		responses = append(responses, ToResponse(item))
	}
	_ = response.Success(w, http.StatusOK, responses, requestID)
}

func (h *Handler) SearchApolices(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())
	q := r.URL.Query().Get("q")

	items, err := h.service.SearchApolices(q)
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	responses := make([]Response, 0, len(items))
	for _, item := range items {
		responses = append(responses, ToResponse(item))
	}
	_ = response.Success(w, http.StatusOK, responses, requestID)
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

		novoJSON := toJSON(item)
		h.logAudit(r, audit.AcaoCriar, audit.EntidadeApolice, item.Luc, nil, &novoJSON)
		_ = response.Success(w, http.StatusCreated, ToResponse(item), requestID)

	default:
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
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
			_ = response.Fail(w, http.StatusBadRequest, "Informe o LUC da apÃƒÂ³lice na URL", requestID, nil)
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

		case http.MethodPut, http.MethodPatch:
			payload, err := decodePayload(r)
			if err != nil {
				_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
				return
			}

			// snapshot antes de editar
			anterior, _ := h.service.Get(itemID)
			anteriorJSON := toJSON(anterior)

			item, err := h.service.Update(itemID, payload)
			if err != nil {
				h.writeError(w, requestID, err)
				return
			}
			novoJSON := toJSON(item)
			h.logAudit(r, audit.AcaoEditar, audit.EntidadeApolice, itemID, &anteriorJSON, &novoJSON)
			_ = response.Success(w, http.StatusOK, ToResponse(item), requestID)

		case http.MethodDelete:
			anterior, _ := h.service.Get(itemID)
			anteriorJSON := toJSON(anterior)
			if err := h.service.Delete(itemID); err != nil {
				h.writeError(w, requestID, err)
				return
			}
			h.logAudit(r, audit.AcaoExcluir, audit.EntidadeApolice, itemID, &anteriorJSON, nil)
			_ = response.Success(w, http.StatusOK, map[string]string{"message": "Apólice excluída com sucesso"}, requestID)

		default:
			_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		}
	}
}

func (h *Handler) GetCoberturas(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	itemID := r.PathValue("id")
	if itemID == "" {
		_ = response.Fail(w, http.StatusBadRequest, "ID da apÃƒÂ³lice nÃƒÂ£o informado", requestID, nil)
		return
	}

	items, err := h.service.GetCoberturas(itemID)
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	_ = response.Success(w, http.StatusOK, items, requestID)
}

func (h *Handler) GetHistorico(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	itemID := r.PathValue("id")
	if itemID == "" {
		_ = response.Fail(w, http.StatusBadRequest, "ID da apÃƒÂ³lice nÃƒÂ£o informado", requestID, nil)
		return
	}

	items, err := h.service.GetHistorico(itemID)
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	_ = response.Success(w, http.StatusOK, items, requestID)
}

func (h *Handler) UpdateObservacoes(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodPatch {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	itemID := r.PathValue("id")
	if itemID == "" {
		_ = response.Fail(w, http.StatusBadRequest, "ID da apólice não informado", requestID, nil)
		return
	}

	var payload struct {
		Observacoes string `json:"observacoes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
		return
	}

	if err := h.service.UpdateObservacoes(itemID, payload.Observacoes); err != nil {
		h.writeError(w, requestID, err)
		return
	}

	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Observações atualizadas com sucesso"}, requestID)
}

func (h *Handler) UpdateApoliceResponsavel(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodPatch {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Método não permitido", requestID, nil)
		return
	}

	itemID := r.PathValue("id")
	if itemID == "" {
		_ = response.Fail(w, http.StatusBadRequest, "ID da apólice não informado", requestID, nil)
		return
	}

	var payload UpdateResponsavelPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "JSON inválido", requestID, nil)
		return
	}

	// This is the specific log requested by the user
	if err := h.service.repo.UpdateResponsavel(itemID, payload.ResponsavelID, "João Carlos"); err != nil {
		log.Printf("Erro ao atribuir responsável: %v", err)
		h.writeError(w, requestID, err)
		return
	}

	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Responsável atualizado com sucesso"}, requestID)
}

func (h *Handler) RenovarApolice(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodPost {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "MÃƒÂ©todo nÃƒÂ£o permitido", requestID, nil)
		return
	}

	itemID := r.PathValue("id")
	if itemID == "" {
		_ = response.Fail(w, http.StatusBadRequest, "ID da apÃƒÂ³lice nÃƒÂ£o informado", requestID, nil)
		return
	}

	var payload RenovacaoPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = response.Fail(w, http.StatusBadRequest, "JSON invÃƒÂ¡lido", requestID, nil)
		return
	}

	if err := h.service.Renovar(itemID, payload.NovaVigencia, payload.NovoValor, "João Carlos"); err != nil {
		h.writeError(w, requestID, err)
		return
	}

	detalhes := fmt.Sprintf(`{"nova_vigencia":%q,"novo_valor":%f}`, payload.NovaVigencia, payload.NovoValor)
	h.logAudit(r, audit.AcaoRenovar, audit.EntidadeApolice, itemID, nil, &detalhes)
	_ = response.Success(w, http.StatusOK, map[string]string{"message": "Apólice renovada com sucesso"}, requestID)
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

// toJSON serializa qualquer valor para string JSON, silenciando erros.
func toJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func (h *Handler) GetAtividadesRecentes(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.RequestIDFromContext(r.Context())

	if r.Method != http.MethodGet {
		_ = response.Fail(w, http.StatusMethodNotAllowed, "Mtodo no permitido", requestID, nil)
		return
	}

	limit := 10
	if limStr := r.URL.Query().Get("limit"); limStr != "" {
		if l, err := strconv.Atoi(limStr); err == nil && l > 0 {
			limit = l
		}
	}

	items, err := h.service.GetAtividadesRecentes(limit)
	if err != nil {
		h.writeError(w, requestID, err)
		return
	}

	_ = response.Success(w, http.StatusOK, items, requestID)
}

func (h *Handler) DownloadDocumento(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	doc, err := h.service.GetDocumentoByID(id)
	if err != nil {
		response.Fail(w, http.StatusNotFound, "Documento nÃœo encontrado", middleware.RequestIDFromContext(r.Context()), nil)
		return
	}

	basePath, err := filepath.Abs("uploads")
	if err != nil {
		response.Fail(w, http.StatusInternalServerError, "Erro interno", middleware.RequestIDFromContext(r.Context()), nil)
		return
	}

	caminhoAbsoluto := filepath.Join(basePath, doc.ArquivoPath)

	// Prevent path traversal
	if !strings.HasPrefix(caminhoAbsoluto, basePath) {
		response.Fail(w, http.StatusForbidden, "Acesso negado", middleware.RequestIDFromContext(r.Context()), nil)
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", doc.Nome))
	http.ServeFile(w, r, caminhoAbsoluto)
}

func (h *Handler) GetDocumentos(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	docs, err := h.service.GetDocumentosByApolice(id)
	if err != nil {
		response.Fail(w, http.StatusInternalServerError, "Erro ao buscar documentos", middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	response.Success(w, http.StatusOK, docs, middleware.RequestIDFromContext(r.Context()))
}

func (h *Handler) UploadDocumento(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	err := r.ParseMultipartForm(10 << 20) // 10 MB
	if err != nil {
		response.Fail(w, http.StatusBadRequest, "Falha ao processar form data", middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Fail(w, http.StatusBadRequest, "Arquivo não encontrado no form", middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	defer file.Close()

	// Ensure uploads dir exists
	basePath := "uploads"
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		response.Fail(w, http.StatusInternalServerError, "Erro ao criar diretório", middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	// Create random filename to avoid collisions
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	filePath := filepath.Join(basePath, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		response.Fail(w, http.StatusInternalServerError, "Erro ao salvar arquivo", middleware.RequestIDFromContext(r.Context()), err)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		response.Fail(w, http.StatusInternalServerError, "Erro ao copiar arquivo", middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	doc := Documento{
		ApoliceLuc:  id,
		Nome:        header.Filename,
		ArquivoPath: filename,
	}

	createdDoc, err := h.service.CreateDocumento(doc)
	if err != nil {
		response.Fail(w, http.StatusInternalServerError, "Erro ao salvar registro do documento", middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	response.Success(w, http.StatusCreated, createdDoc, middleware.RequestIDFromContext(r.Context()))
}
