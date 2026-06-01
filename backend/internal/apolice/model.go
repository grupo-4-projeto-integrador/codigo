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
	Responsavel   string    `json:"responsavel"`
	Observacoes   string    `json:"observacoes"`
}

type Cobertura struct {
	ID         int     `json:"id"`
	ApoliceLuc string  `json:"apolice_luc"`
	Nome       string  `json:"nome"`
	Descricao  string  `json:"descricao"`
	Valor      float64 `json:"valor"`
}

type HistoricoApolice struct {
	ID         int       `json:"id"`
	ApoliceLuc string    `json:"apolice_luc"`
	Data       time.Time `json:"data"`
	Descricao  string    `json:"descricao"`
	Ator       string    `json:"ator"`
}