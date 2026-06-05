package audit

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// ListFilter define os filtros disponíveis na página /admin/auditoria
type ListFilter struct {
	Acao       string
	Entidade   string
	EntidadeID string
	UserID     string
	De         *time.Time
	Ate        *time.Time
	Limit      int
	Offset     int
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Insert grava um registro de auditoria — operação fire-and-forget (nunca bloqueia o fluxo principal).
func (r *Repository) Insert(log AuditLog) error {
	_, err := r.db.Exec(
		`INSERT INTO audit_logs (user_id, acao, entidade, entidade_id, payload_anterior, payload_novo, ip, user_agent, timestamp)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		log.UserID,
		log.Acao,
		log.Entidade,
		log.EntidadeID,
		log.PayloadAnterior,
		log.PayloadNovo,
		log.IP,
		log.UserAgent,
		log.Timestamp,
	)
	return err
}

// List retorna registros de auditoria com filtros e paginação.
func (r *Repository) List(f ListFilter) ([]AuditLog, int, error) {
	where := []string{"1=1"}
	args := []any{}
	idx := 1

	if f.Acao != "" {
		where = append(where, fmt.Sprintf("acao = $%d", idx))
		args = append(args, f.Acao)
		idx++
	}
	if f.Entidade != "" {
		where = append(where, fmt.Sprintf("entidade = $%d", idx))
		args = append(args, f.Entidade)
		idx++
	}
	if f.EntidadeID != "" {
		where = append(where, fmt.Sprintf("entidade_id ILIKE $%d", idx))
		args = append(args, "%"+f.EntidadeID+"%")
		idx++
	}
	if f.UserID != "" {
		where = append(where, fmt.Sprintf("user_id ILIKE $%d", idx))
		args = append(args, "%"+f.UserID+"%")
		idx++
	}
	if f.De != nil {
		where = append(where, fmt.Sprintf("timestamp >= $%d", idx))
		args = append(args, *f.De)
		idx++
	}
	if f.Ate != nil {
		where = append(where, fmt.Sprintf("timestamp <= $%d", idx))
		args = append(args, *f.Ate)
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	// Count
	var total int
	countArgs := make([]any, len(args))
	copy(countArgs, args)
	if err := r.db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM audit_logs WHERE %s", whereClause), countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Pagination
	limit := f.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	offset := f.Offset
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(
		`SELECT id, user_id, acao, entidade, entidade_id, payload_anterior, payload_novo, ip, user_agent, timestamp
		 FROM audit_logs WHERE %s
		 ORDER BY timestamp DESC
		 LIMIT $%d OFFSET $%d`,
		whereClause, idx, idx+1,
	)
	args = append(args, limit, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	logs := make([]AuditLog, 0)
	for rows.Next() {
		var l AuditLog
		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Acao, &l.Entidade, &l.EntidadeID,
			&l.PayloadAnterior, &l.PayloadNovo,
			&l.IP, &l.UserAgent, &l.Timestamp,
		); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}

	return logs, total, nil
}
