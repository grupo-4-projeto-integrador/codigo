package apolice

import "time"

type Apolice struct {
	Luc           string    `json:"id"`
	Loja          string    `json:"lojista"`
	Segmento      string    `json:"tipo"`
	Seguradora    string    `json:"seguradora"`
	Vigencia      time.Time `json:"vigencia"`
	Vencimento    time.Time `json:"vencimento"`
	Status        string    `json:"status"`
	Cobertura     float64   `json:"cobertura"`
	DiasRestantes int       `json:"dias_restantes"`
}