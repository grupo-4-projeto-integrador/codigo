package apolice

import "time"

type Apolice struct {
	Luc        string
	Fantasia   string
	Segmento   string
	Seguradora string
	Vigencia   time.Time
	Vencimento time.Time
	Status     string
}