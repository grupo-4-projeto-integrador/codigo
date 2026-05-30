package apolice

import (
	"math"
	"sort"
	"strings"
	"time"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List() ([]Apolice, error) {
	items, err := s.repo.List()
	if err != nil {
		return nil, err
	}
	for i := range items {
		items[i].DiasRestantes = calculateDaysRemaining(items[i].Vencimento)
		items[i].Status = calculatePolicyStatus(items[i].Vencimento)
	}
	return items, nil
}

func (s *Service) GetFilaDeAcao() ([]Apolice, error) {
	items, err := s.List()
	if err != nil {
		return nil, err
	}

	// Calcula score de urgência: Valor x Prazo (Risco temporal)
	// Vencidas ganham risco alto, próximas do vencimento ganham risco moderado.
	type scoredApolice struct {
		policy Apolice
		score  float64
	}

	scored := make([]scoredApolice, 0, len(items))
	for _, item := range items {
		// Pular apólices ativas sem urgência (mais de 90 dias)
		if item.Status == "Ativa" && item.DiasRestantes > 90 {
			continue
		}

		risk := 0.0
		if item.DiasRestantes < 0 {
			// Vencida: base 100 + dias de atraso (ex: 105 dias = risco 205)
			risk = 100.0 + float64(-item.DiasRestantes)
		} else {
			// A Vencer ou Ativa (0 a 90 dias): base 100 menos dias restantes (ex: 5 dias = risco 95)
			risk = math.Max(1.0, 100.0-float64(item.DiasRestantes))
		}

		score := item.Cobertura * risk
		scored = append(scored, scoredApolice{policy: item, score: score})
	}

	// Ordena por score decrescente
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	// Retorna top 10
	limit := 10
	if len(scored) < limit {
		limit = len(scored)
	}

	result := make([]Apolice, 0, limit)
	for i := 0; i < limit; i++ {
		result = append(result, scored[i].policy)
	}

	return result, nil
}

func (s *Service) Get(luc string) (Apolice, error) {
	item, err := s.repo.Get(luc)
	if err != nil {
		return Apolice{}, err
	}
	item.DiasRestantes = calculateDaysRemaining(item.Vencimento)
	item.Status = calculatePolicyStatus(item.Vencimento)
	return item, nil
}

func (s *Service) Create(payload Payload) (Apolice, error) {
	model, err := s.buildModel(payload)
	if err != nil {
		return Apolice{}, err
	}

	return s.repo.Create(model)
}

func (s *Service) Update(luc string, payload Payload) (Apolice, error) {
	model, err := s.buildModel(payload)
	if err != nil {
		return Apolice{}, err
	}

	return s.repo.Update(luc, model)
}

func (s *Service) Delete(luc string) error {
	return s.repo.Delete(luc)
}

func (s *Service) buildModel(payload Payload) (Apolice, error) {
	if strings.TrimSpace(payload.Luc) == "" || strings.TrimSpace(payload.Loja) == "" || strings.TrimSpace(payload.Segmento) == "" || strings.TrimSpace(payload.Seguradora) == "" || strings.TrimSpace(payload.Vigencia) == "" || strings.TrimSpace(payload.Vencimento) == "" {
		return Apolice{}, ErrValidation("Todos os campos são obrigatórios")
	}

	vigencia, err := ParseDate(payload.Vigencia)
	if err != nil {
		return Apolice{}, err
	}
	vencimento, err := ParseDate(payload.Vencimento)
	if err != nil {
		return Apolice{}, err
	}

	return Apolice{
		Luc:           strings.TrimSpace(payload.Luc),
		Loja:          strings.TrimSpace(payload.Loja),
		Segmento:      strings.TrimSpace(payload.Segmento),
		Seguradora:    strings.TrimSpace(payload.Seguradora),
		Vigencia:      vigencia,
		Vencimento:    vencimento,
		Status:        calculatePolicyStatus(vencimento),
		Cobertura:     payload.Cobertura,
		DiasRestantes: calculateDaysRemaining(vencimento),
	}, nil
}

func calculateDaysRemaining(vencimento time.Time) int {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dueDate := time.Date(vencimento.Year(), vencimento.Month(), vencimento.Day(), 0, 0, 0, 0, now.Location())
	return int(dueDate.Sub(today).Hours() / 24)
}

func calculatePolicyStatus(vencimento time.Time) string {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dueDate := time.Date(vencimento.Year(), vencimento.Month(), vencimento.Day(), 0, 0, 0, 0, now.Location())
	daysRemaining := int(dueDate.Sub(today).Hours() / 24)

	if daysRemaining < 0 {
		return "Vencida"
	}
	if daysRemaining <= 30 {
		return "A Vencer"
	}
	return "Ativa"
}