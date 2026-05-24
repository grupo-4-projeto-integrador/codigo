package apolice

import "time"

type Payload struct {
	Luc        string `json:"luc"`
	Fantasia   string `json:"fantasia"`
	Segmento   string `json:"segmento"`
	Seguradora string `json:"seguradora"`
	Vigencia   string `json:"vigencia"`
	Vencimento string `json:"vencimento"`
}

type Response struct {
	Luc             string `json:"luc"`
	Fantasia        string `json:"fantasia"`
	Segmento        string `json:"segmento"`
	Seguradora      string `json:"seguradora"`
	Vigencia        string `json:"vigencia"`
	Vencimento      string `json:"vencimento"`
	Status          string `json:"status"`
	StatusDaApolice string `json:"status_da_apolice"`
}

func ToResponse(model Apolice) Response {
	response := Response{
		Luc:        model.Luc,
		Fantasia:   model.Fantasia,
		Segmento:   model.Segmento,
		Seguradora: model.Seguradora,
		Status:     model.Status,
	}

	if !model.Vigencia.IsZero() {
		response.Vigencia = model.Vigencia.Format("02/01/2006")
	}
	if !model.Vencimento.IsZero() {
		response.Vencimento = model.Vencimento.Format("02/01/2006")
	}

	response.StatusDaApolice = model.Status
	return response
}

func ParseDate(value string) (time.Time, error) {
	layouts := []string{"2006-01-02", "02/01/2006"}
	for _, layout := range layouts {
		if parsed, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, ErrValidation("data inválida: " + value)
}