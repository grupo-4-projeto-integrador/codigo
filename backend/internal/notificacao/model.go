package notificacao

import "time"

type Notificacao struct {
	ID         int       `json:"id"`
	UsuarioID  int       `json:"usuario_id"`
	ApoliceLUC string    `json:"luc"`
	Tipo       string    `json:"type"` // "vencida" ou "a_vencer"
	Lida       bool      `json:"lida"`
	Arquivada  bool      `json:"arquivada"`
	CreatedAt  time.Time `json:"created_at"`

	// Dados enriquecidos da apólice (JOIN)
	Loja      string `json:"loja,omitempty"`
	Cobertura string `json:"cobertura,omitempty"`
	Dias      int    `json:"dias,omitempty"`

	// Usado para atividades da equipe
	Mensagem string `json:"mensagem,omitempty"`
}
