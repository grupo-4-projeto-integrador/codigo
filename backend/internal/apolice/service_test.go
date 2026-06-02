package apolice

import (
	"errors"
	"testing"
	"time"
)

type MockRepository struct {
	Apolices []Apolice
	Err      error
}

func (m *MockRepository) List() ([]Apolice, error) {
	return m.Apolices, m.Err
}

func (m *MockRepository) Get(luc string) (Apolice, error) {
	if m.Err != nil {
		return Apolice{}, m.Err
	}
	for _, a := range m.Apolices {
		if a.Luc == luc {
			return a, nil
		}
	}
	return Apolice{}, errors.New("not found")
}

func (m *MockRepository) Create(model Apolice) (Apolice, error) {
	if m.Err != nil {
		return Apolice{}, m.Err
	}
	m.Apolices = append(m.Apolices, model)
	return model, nil
}

func (m *MockRepository) Update(luc string, model Apolice) (Apolice, error) {
	if m.Err != nil {
		return Apolice{}, m.Err
	}
	for i, a := range m.Apolices {
		if a.Luc == luc {
			m.Apolices[i] = model
			return model, nil
		}
	}
	return Apolice{}, errors.New("not found")
}

func (m *MockRepository) Delete(luc string) error {
	return m.Err
}

func (m *MockRepository) GetCoberturas(luc string) ([]Cobertura, error) {
	return nil, m.Err
}

func (m *MockRepository) GetHistorico(luc string) ([]HistoricoApolice, error) {
	return nil, m.Err
}

func (m *MockRepository) GetDocumentoByID(id string) (Documento, error) {
	return Documento{}, m.Err
}

func (m *MockRepository) GetDocumentosByApolice(luc string) ([]Documento, error) {
	return nil, m.Err
}

func (m *MockRepository) GetHistoricoGlobal(limit int) ([]HistoricoApolice, error) {
	return nil, m.Err
}

func (m *MockRepository) GetAtividadesRecentes(limit int) ([]AtividadeRecente, error) {
	return nil, m.Err
}

func (m *MockRepository) GetLojas() ([]LojaInfo, error) {
	return nil, m.Err
}

func (m *MockRepository) UpdateObservacoes(luc string, observacoes string) error {
	return m.Err
}

func (m *MockRepository) Renovar(luc string, novoVencimento time.Time, novoValor float64, ator string, descricao string) error {
	return m.Err
}

func TestService_Create(t *testing.T) {
	repo := &MockRepository{}
	svc := NewService(repo)

	payload := Payload{
		Luc:        "TEST_LUC",
		Loja:       "TEST_FANTASIA",
		Segmento:   "TEST_SEGMENTO",
		Seguradora: "TEST_SEGURADORA",
		Vigencia:   "2024-01-01",
		Vencimento: "2026-12-31",
	}

	created, err := svc.Create(payload)
	if err != nil {
		t.Fatalf("esperava sucesso, obteve erro: %v", err)
	}

	if created.Luc != "TEST_LUC" {
		t.Errorf("esperava Luc = TEST_LUC, obteve %s", created.Luc)
	}
	if created.Status != "Ativa" {
		t.Errorf("esperava Status = Ativa, obteve %s", created.Status)
	}
}

func TestService_Create_ValidationFail(t *testing.T) {
	repo := &MockRepository{}
	svc := NewService(repo)

	payload := Payload{
		Luc: "", // campo vazio deve falhar
	}

	_, err := svc.Create(payload)
	if err == nil {
		t.Fatal("esperava erro de validação, não obteve erro")
	}
}
