package audit

import (
	"context"
	"database/sql"
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
