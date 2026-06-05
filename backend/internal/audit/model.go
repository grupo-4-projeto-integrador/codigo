package audit

import "time"

// AuditLog é um registro imutável de uma ação do sistema.
// Campos são snake_case para corresponder à tabela audit_logs.
type AuditLog struct {
	ID              int64      `json:"id"`
	UserID          string     `json:"user_id"`
	Acao            string     `json:"acao"`
	Entidade        string     `json:"entidade"`
	EntidadeID      string     `json:"entidade_id"`
	PayloadAnterior *string    `json:"payload_anterior"` // JSON raw ou null
	PayloadNovo     *string    `json:"payload_novo"`     // JSON raw ou null
	IP              string     `json:"ip"`
	UserAgent       string     `json:"user_agent"`
	Timestamp       time.Time  `json:"timestamp"`
}

// Constantes de ação para uso em todo o código
const (
	AcaoCriar    = "criar"
	AcaoEditar   = "editar"
	AcaoRenovar  = "renovar"
	AcaoExcluir  = "excluir"
	AcaoExportar = "exportar"
	AcaoLogin    = "login"
	AcaoUpload   = "upload_documento"
)

const (
	EntidadeApolice   = "apolice"
	EntidadeDocumento = "documento"
	EntidadeUsuario   = "usuario"
	EntidadeSistema   = "sistema"
)
