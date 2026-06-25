package relatorio

// DadosDashboard contém os dados do dashboard enviados pelo frontend
// para geração do relatório executivo via Gemini.
type DadosDashboard struct {
	NomeShopping      string  `json:"nome_shopping"`
	HealthScore       int     `json:"health_score"`
	DeltaSemanal      int     `json:"delta_semanal"`
	TotalApolices     int     `json:"total_apolices"`
	Conformes         int     `json:"conformes"`
	AVencer           int     `json:"a_vencer"`
	Vencidas          int     `json:"vencidas"`
	CoberturaTotalM   float64 `json:"cobertura_total_m"`
	SegmentosCriticos string  `json:"segmentos_criticos"`
	AcoesUrgentes     string  `json:"acoes_urgentes"`
	DataReferencia    string  `json:"data_referencia"`
}
