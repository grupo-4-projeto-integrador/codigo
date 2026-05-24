package apolice

import (
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
	return s.repo.List()
}

func (s *Service) Get(luc string) (Apolice, error) {
	return s.repo.Get(luc)
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
	if strings.TrimSpace(payload.Luc) == "" || strings.TrimSpace(payload.Fantasia) == "" || strings.TrimSpace(payload.Segmento) == "" || strings.TrimSpace(payload.Seguradora) == "" || strings.TrimSpace(payload.Vigencia) == "" || strings.TrimSpace(payload.Vencimento) == "" {
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
		Luc:        strings.TrimSpace(payload.Luc),
		Fantasia:   strings.TrimSpace(payload.Fantasia),
		Segmento:   strings.TrimSpace(payload.Segmento),
		Seguradora: strings.TrimSpace(payload.Seguradora),
		Vigencia:   vigencia,
		Vencimento: vencimento,
		Status:     calculatePolicyStatus(vencimento),
	}, nil
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