package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"
)

// Service encapsula o repositório e expõe métodos de alto nível.
type Service struct {
	repo *Repository
	db   *sql.DB // para resolver nome do usuário via user_id
}

// contextKeyUserID é a mesma chave usada pelo pacote auth (duplicada aqui para evitar ciclo de import).
type contextKey string

const contextKeyUserID contextKey = "user_id"

func NewService(repo *Repository, db *sql.DB) *Service {
	return &Service{repo: repo, db: db}
}

// Log grava um AuditLog de forma assíncrona para não bloquear a resposta HTTP.
// Erros são apenas logados — um erro de auditoria NUNCA deve impedir a ação principal.
func (s *Service) Log(entry AuditLog) {
	go func() {
		entry.Timestamp = time.Now().UTC()
		if err := s.repo.Insert(entry); err != nil {
			log.Printf("Erro ao salvar audit log: %v", err)
		}
	}()
}

// resolveUserName busca o nome do usuário pelo ID numérico.
// Retorna o ID em string como fallback se não encontrar.
func (s *Service) resolveUserName(userID int) string {
	if s.db == nil || userID == 0 {
		return "sistema"
	}
	var nome string
	err := s.db.QueryRow(`SELECT nome FROM usuarios WHERE id = $1`, userID).Scan(&nome)
	if err != nil {
		return fmt.Sprintf("usuario_%d", userID)
	}
	return nome
}

// LogFromRequest constrói e grava um AuditLog usando dados da requisição HTTP.
// Resolve o nome real do usuário, captura IP e User-Agent.
func (s *Service) LogFromRequest(r *http.Request, acao, entidade, entidadeID string, anterior, novo *string) {
	ip := extractIP(r)
	userID, _ := r.Context().Value(contextKeyUserID).(int)
	userName := s.resolveUserName(userID)

	// payload_novo recebe também o user-agent como metadado de sessão
	var novoFinal *string
	if novo != nil {
		novoFinal = novo
	} else {
		ua := fmt.Sprintf(`{"user_agent":%q,"ip":%q}`, r.UserAgent(), ip)
		novoFinal = &ua
	}

	s.Log(AuditLog{
		UserID:          userName,
		Acao:            acao,
		Entidade:        entidade,
		EntidadeID:      entidadeID,
		PayloadAnterior: anterior,
		PayloadNovo:     novoFinal,
		IP:              ip,
		UserAgent:       r.UserAgent(),
	})
}

// LogFromRequestWithPayloads é como LogFromRequest mas respeita payloads explícitos
// e ainda anexa user-agent/ip no campo user_agent.
func (s *Service) LogFromRequestWithPayloads(r *http.Request, acao, entidade, entidadeID string, anterior, novo *string) {
	ip := extractIP(r)
	userID, _ := r.Context().Value(contextKeyUserID).(int)
	userName := s.resolveUserName(userID)

	s.Log(AuditLog{
		UserID:          userName,
		Acao:            acao,
		Entidade:        entidade,
		EntidadeID:      entidadeID,
		PayloadAnterior: anterior,
		PayloadNovo:     novo,
		IP:              ip,
		UserAgent:       r.UserAgent(),
	})
}

// Registrar — mantido para compatibilidade; internamente delega para Log sem request.
// Prefira LogFromRequest quando tiver o *http.Request disponível.
func (s *Service) Registrar(ctx context.Context, userID, acao, entidade, entidadeID string, anterior, novo *string) error {
	s.Log(AuditLog{
		UserID:          userID,
		Acao:            acao,
		Entidade:        entidade,
		EntidadeID:      entidadeID,
		PayloadAnterior: anterior,
		PayloadNovo:     novo,
	})
	return nil
}

func (s *Service) List(f ListFilter) ([]AuditLog, int, error) {
	return s.repo.List(f)
}

// ReverterUltimaAcao localiza o último log de auditoria para a dada entidade/acao e o reverte.
func (s *Service) ReverterUltimaAcao(ctx context.Context, entidade, entidadeID, acao string) error {
	var logItem AuditLog
	err := s.db.QueryRow(`
		SELECT id, acao, entidade, entidade_id, payload_anterior 
		FROM audit_logs 
		WHERE entidade = $1 AND entidade_id = $2 AND acao = $3 
		ORDER BY id DESC LIMIT 1`, entidade, entidadeID, acao).
		Scan(&logItem.ID, &logItem.Acao, &logItem.Entidade, &logItem.EntidadeID, &logItem.PayloadAnterior)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("ação não encontrada para reversão")
		}
		return fmt.Errorf("erro ao buscar ação para reversão: %v", err)
	}

	return s.ReverterLog(ctx, logItem)
}

// ReverterPorID busca e reverte um audit log específico.
func (s *Service) ReverterPorID(ctx context.Context, auditID int64) error {
	var logItem AuditLog
	err := s.db.QueryRow(`
		SELECT id, acao, entidade, entidade_id, payload_anterior 
		FROM audit_logs 
		WHERE id = $1`, auditID).
		Scan(&logItem.ID, &logItem.Acao, &logItem.Entidade, &logItem.EntidadeID, &logItem.PayloadAnterior)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("log de auditoria não encontrado")
		}
		return err
	}

	return s.ReverterLog(ctx, logItem)
}

// ReverterLog aplica a lógica de desfazer baseada no log fornecido.
func (s *Service) ReverterLog(ctx context.Context, logItem AuditLog) error {
	if logItem.Entidade != EntidadeApolice {
		return fmt.Errorf("reversão suportada apenas para apólices (entidade atual: %s)", logItem.Entidade)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	switch logItem.Acao {
	case AcaoExcluir:
		// Restaurar exclusão (soft delete)
		_, err = tx.Exec(`UPDATE seguros SET deleted_at = NULL WHERE luc = $1`, logItem.EntidadeID)
		if err != nil {
			return err
		}
	
	case AcaoEditar, AcaoRenovar:
		if logItem.PayloadAnterior == nil || *logItem.PayloadAnterior == "" || *logItem.PayloadAnterior == "null" {
			return fmt.Errorf("sem dados anteriores (payload_anterior nulo) para reverter a ação")
		}

		var anterior map[string]interface{}
		if err := json.Unmarshal([]byte(*logItem.PayloadAnterior), &anterior); err != nil {
			return fmt.Errorf("falha ao interpretar os dados anteriores: %v", err)
		}

		// Prepara o update dinamico com base nas chaves conhecidas
		// A struct Apolice salva esses campos em JSON
		luc, _ := anterior["id"].(string)
		if luc == "" {
			luc = logItem.EntidadeID // fallback
		}
		
		loja, _ := anterior["lojista"].(string)
		segmento, _ := anterior["tipo"].(string)
		seguradora, _ := anterior["seguradora"].(string)
		vigencia, _ := anterior["vigencia"].(string)
		vencimento, _ := anterior["vencimento"].(string)
		status, _ := anterior["status"].(string)
		cobertura, _ := anterior["cobertura"].(float64)
		responsavel, _ := anterior["responsavel"].(string)
		observacoes, _ := anterior["observacoes"].(string)
		cnpj, _ := anterior["cnpj"].(string)
		numeroApolice, _ := anterior["numero_apolice"].(string)

		_, err = tx.Exec(`
			UPDATE seguros 
			SET 
				loja = $1, segmento = $2, seguradora = $3, 
				vigencia = NULLIF($4, '')::timestamp, 
				vencimento = NULLIF($5, '')::timestamp, 
				status = $6, cobertura = $7, responsavel = $8, 
				observacoes = $9, cnpj = $10, numero_apolice = $11
			WHERE luc = $12
		`, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, responsavel, observacoes, cnpj, numeroApolice, luc)
		
		if err != nil {
			return fmt.Errorf("erro ao restaurar dados da apólice: %v", err)
		}

	default:
		return fmt.Errorf("ação não suportada para reversão: %s", logItem.Acao)
	}

	// Insere log no histórico da apólice
	userID, _ := ctx.Value(contextKeyUserID).(int)
	userName := s.resolveUserName(userID)
	desc := fmt.Sprintf("Ação de '%s' revertida", logItem.Acao)
	_, err = tx.Exec(`INSERT INTO historico_apolice (apolice_luc, data, descricao, ator) VALUES ($1, NOW(), $2, $3)`, logItem.EntidadeID, desc, userName)
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// Opcional: Registrar no próprio audit_logs que uma reversão ocorreu
	detalhes := fmt.Sprintf(`{"reverteu_log_id": %d, "acao_revertida": %q}`, logItem.ID, logItem.Acao)
	s.Log(AuditLog{
		UserID:      userName,
		Acao:        "reverter",
		Entidade:    "audit_log",
		EntidadeID:  fmt.Sprintf("%d", logItem.ID),
		PayloadNovo: &detalhes,
		IP:          "127.0.0.1", // or passed from request, keep simple here
		UserAgent:   "Sistema",
	})

	return nil
}

// extractIP tenta obter o IP real do cliente, respeitando proxies.
func extractIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := splitAndTrim(xff)
		if len(parts) > 0 {
			return parts[0]
		}
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func splitAndTrim(s string) []string {
	var parts []string
	for _, p := range splitComma(s) {
		if t := trim(p); t != "" {
			parts = append(parts, t)
		}
	}
	return parts
}

func splitComma(s string) []string {
	var out []string
	start := 0
	for i, c := range s {
		if c == ',' {
			out = append(out, s[start:i])
			start = i + 1
		}
	}
	out = append(out, s[start:])
	return out
}

func trim(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t') {
		s = s[:len(s)-1]
	}
	return s
}

var _ = log.Printf // ensure log is used in goroutines if needed
