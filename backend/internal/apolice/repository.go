package apolice

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

const tableName = `seguros`

type Repository interface {
	List() ([]Apolice, error)
	Get(luc string) (Apolice, error)
	Create(model Apolice) (Apolice, error)
	Update(luc string, model Apolice) (Apolice, error)
	Delete(luc string) error
	GetCoberturas(luc string) ([]Cobertura, error)
	GetHistorico(luc string) ([]HistoricoApolice, error)
	UpdateObservacoes(luc string, observacoes string) error
	Renovar(luc string, novoVencimento time.Time, novoValor float64, ator string, descricao string) error
	GetLojas() ([]LojaInfo, error)
}

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) List() ([]Apolice, error) {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, COALESCE(responsavel, ''), COALESCE(observacoes, '') FROM %s WHERE deleted_at IS NULL ORDER BY luc`, tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Apolice, 0)
	for rows.Next() {
		item, err := scanApolice(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *PostgresRepository) Get(luc string) (Apolice, error) {
	row := r.db.QueryRow(fmt.Sprintf(`SELECT luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, COALESCE(responsavel, ''), COALESCE(observacoes, '') FROM %s WHERE luc = $1 AND deleted_at IS NULL`, tableName), luc)
	return scanApolice(row)
}

func (r *PostgresRepository) Create(model Apolice) (Apolice, error) {
	row := r.db.QueryRow(
		fmt.Sprintf(`INSERT INTO %s (luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, responsavel, observacoes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, COALESCE(responsavel, ''), COALESCE(observacoes, '')`, tableName),
		model.Luc,
		model.Loja,
		model.Segmento,
		model.Seguradora,
		model.Vigencia,
		model.Vencimento,
		model.Status,
		model.Cobertura,
		model.Responsavel,
		model.Observacoes,
	)

	return scanApolice(row)
}

func (r *PostgresRepository) Update(luc string, model Apolice) (Apolice, error) {
	row := r.db.QueryRow(
		fmt.Sprintf(`UPDATE %s
		 SET luc = $1, loja = $2, segmento = $3, seguradora = $4, vigencia = $5, vencimento = $6, status = $7, cobertura = $8, responsavel = $9, observacoes = $10
		 WHERE luc = $11
		 RETURNING luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, COALESCE(responsavel, ''), COALESCE(observacoes, '')`, tableName),
		model.Luc,
		model.Loja,
		model.Segmento,
		model.Seguradora,
		model.Vigencia,
		model.Vencimento,
		model.Status,
		model.Cobertura,
		model.Responsavel,
		model.Observacoes,
		luc,
	)

	return scanApolice(row)
}

func (r *PostgresRepository) Delete(luc string) error {
	res, err := r.db.Exec(fmt.Sprintf(`UPDATE %s SET deleted_at = CURRENT_TIMESTAMP WHERE luc = $1 AND deleted_at IS NULL`, tableName), luc)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *PostgresRepository) GetCoberturas(luc string) ([]Cobertura, error) {
	rows, err := r.db.Query(`SELECT id, apolice_luc, nome, descricao, valor FROM coberturas WHERE apolice_luc = $1 ORDER BY id`, luc)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Cobertura, 0)
	for rows.Next() {
		var item Cobertura
		var desc sql.NullString
		if err := rows.Scan(&item.ID, &item.ApoliceLuc, &item.Nome, &desc, &item.Valor); err != nil {
			return nil, err
		}
		item.Descricao = desc.String
		items = append(items, item)
	}
	return items, nil
}

func (r *PostgresRepository) GetHistorico(luc string) ([]HistoricoApolice, error) {
	rows, err := r.db.Query(`SELECT id, apolice_luc, data, descricao, ator FROM historico_apolice WHERE apolice_luc = $1 ORDER BY data DESC`, luc)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]HistoricoApolice, 0)
	for rows.Next() {
		var item HistoricoApolice
		if err := rows.Scan(&item.ID, &item.ApoliceLuc, &item.Data, &item.Descricao, &item.Ator); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *PostgresRepository) UpdateObservacoes(luc string, observacoes string) error {
	res, err := r.db.Exec(fmt.Sprintf(`UPDATE %s SET observacoes = $1 WHERE luc = $2`, tableName), observacoes, luc)
	if err != nil {
		return err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) Renovar(luc string, novoVencimento time.Time, novoValor float64, ator string, descricao string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec(fmt.Sprintf(`UPDATE %s SET vencimento = $1, cobertura = $2 WHERE luc = $3`, tableName), novoVencimento, novoValor, luc)
	if err != nil {
		return err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}

	_, err = tx.Exec(`INSERT INTO historico_apolice (apolice_luc, data, descricao, ator) VALUES ($1, NOW(), $2, $3)`, luc, descricao, ator)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func scanApolice(scanner interface{ Scan(...any) error }) (Apolice, error) {
	var item Apolice
	var vigencia sql.NullTime
	var vencimento sql.NullTime
	var loja sql.NullString
	var segmento sql.NullString
	var seguradora sql.NullString
	var status sql.NullString
	var cobertura sql.NullFloat64
	var responsavel sql.NullString
	var observacoes sql.NullString

	if err := scanner.Scan(&item.Luc, &loja, &segmento, &seguradora, &vigencia, &vencimento, &status, &cobertura, &responsavel, &observacoes); err != nil {
		return Apolice{}, err
	}

	item.Loja = strings.TrimSpace(loja.String)
	item.Segmento = strings.TrimSpace(segmento.String)
	item.Seguradora = strings.TrimSpace(seguradora.String)
	item.Vigencia = vigencia.Time
	item.Vencimento = vencimento.Time
	item.Status = strings.TrimSpace(status.String)
	item.Cobertura = cobertura.Float64
	item.Responsavel = strings.TrimSpace(responsavel.String)
	item.Observacoes = strings.TrimSpace(observacoes.String)

	return item, nil
}

type LojaInfo struct {
	Luc      string `json:"luc"`
	Nome     string `json:"nome"`
	Segmento string `json:"segmento"`
}

func (r *PostgresRepository) GetLojas() ([]LojaInfo, error) {
	rows, err := r.db.Query(`SELECT DISTINCT luc, loja, segmento FROM seguros WHERE deleted_at IS NULL AND loja IS NOT NULL AND loja != '' ORDER BY luc`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []LojaInfo
	for rows.Next() {
		var item LojaInfo
		if err := rows.Scan(&item.Luc, &item.Nome, &item.Segmento); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
