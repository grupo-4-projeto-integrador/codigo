package apolice

import "time"

type Payload struct {
	Luc        string  `json:"luc"`
	Loja       string  `json:"loja"`
	Segmento   string  `json:"segmento"`
	Seguradora string  `json:"seguradora"`
	Vigencia   string  `json:"vigencia"`
	Vencimento string  `json:"vencimento"`
	Cobertura  float64 `json:"cobertura"`
	Observacoes string `json:"observacoes"`
}

type Response struct {
	Luc           string  `json:"id"`
	Loja          string  `json:"lojista"`
	Segmento      string  `json:"tipo"`
	Seguradora    string  `json:"seguradora"`
	Vigencia      string  `json:"vigencia"`
	Vencimento    string  `json:"vencimento"`
	Status        string  `json:"status"`
	Cobertura     float64 `json:"cobertura"`
	DiasRestantes int     `json:"dias_restantes"`
	Responsavel   string  `json:"responsavel"`
	Observacoes   string  `json:"observacoes"`
}

func ToResponse(model Apolice) Response {
	response := Response{
		Luc:           model.Luc,
		Loja:          model.Loja,
		Segmento:      model.Segmento,
		Seguradora:    model.Seguradora,
		Status:        model.Status,
		Cobertura:     model.Cobertura,
		DiasRestantes: model.DiasRestantes,
		Responsavel:   model.Responsavel,
		Observacoes:   model.Observacoes,
	}

	if !model.Vigencia.IsZero() {
		response.Vigencia = model.Vigencia.Format("02/01/2006")
	}
	if !model.Vencimento.IsZero() {
		response.Vencimento = model.Vencimento.Format("02/01/2006")
	}

	return response
}

func ParseDate(value string) (time.Time, error) {
	layouts := []string{"2006-01-02", "02/01/2006"}
	for _, layout := range layouts {
		if parsed, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, ErrValidation("data invÃ¡lida: " + value)
}

type RenovacaoPayload struct {
	NovaVigencia string  `json:"nova_vigencia"`
	NovoValor    float64 `json:"novo_valor"`
}
type DocumentoDTO struct {
	ID          int    `json:"id"`
	ApoliceLuc  string `json:"apolice_luc"`
	Nome        string `json:"nome"`
	DataAdicao  string `json:"data_adicao"`
}


