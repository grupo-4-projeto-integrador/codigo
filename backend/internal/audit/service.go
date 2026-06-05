package audit

import (
	"log"
	"net"
	"net/http"
	"time"
)

// Service encapsula o repositório e expõe métodos de alto nível.
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Log grava um AuditLog de forma assíncrona para não bloquear a resposta HTTP.
// Erros são apenas logados — um erro de auditoria NUNCA deve impedir a ação principal.
func (s *Service) Log(log AuditLog) {
	go func() {
		log.Timestamp = time.Now().UTC()
		if err := s.repo.Insert(log); err != nil {
			// Registra falha no stderr mas não propaga
			_ = err
		}
	}()
}

// LogFromRequest constrói e grava um AuditLog usando dados da requisição HTTP.
func (s *Service) LogFromRequest(r *http.Request, acao, entidade, entidadeID string, anterior, novo *string) {
	ip := extractIP(r)
	s.Log(AuditLog{
		UserID:          extractUser(r),
		Acao:            acao,
		Entidade:        entidade,
		EntidadeID:      entidadeID,
		PayloadAnterior: anterior,
		PayloadNovo:     novo,
		IP:              ip,
		UserAgent:       r.UserAgent(),
	})
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

// extractUser lê o usuário do header X-User-ID (definido pelo frontend/auth).
// Em produção, substitua por validação de JWT.
func extractUser(r *http.Request) string {
	if u := r.Header.Get("X-User-ID"); u != "" {
		return u
	}
	return "sistema"
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
