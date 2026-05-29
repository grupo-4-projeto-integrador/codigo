package apolice

import (
	"database/sql"
	"fmt"
	"strings"
)

const tableName = `seguros`

type Repository interface {
	List() ([]Apolice, error)
	Get(luc string) (Apolice, error)
	Create(model Apolice) (Apolice, error)
	Update(luc string, model Apolice) (Apolice, error)
	Delete(luc string) error
}

type PostgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) List() ([]Apolice, error) {
	rows, err := r.db.Query(fmt.Sprintf(`SELECT luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura FROM %s ORDER BY luc`, tableName))
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
	row := r.db.QueryRow(fmt.Sprintf(`SELECT luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura FROM %s WHERE luc = $1`, tableName), luc)
	return scanApolice(row)
}

func (r *PostgresRepository) Create(model Apolice) (Apolice, error) {
	row := r.db.QueryRow(
		fmt.Sprintf(`INSERT INTO %s (luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura`, tableName),
		model.Luc,
		model.Loja,
		model.Segmento,
		model.Seguradora,
		model.Vigencia,
		model.Vencimento,
		model.Status,
		model.Cobertura,
	)

	return scanApolice(row)
}

func (r *PostgresRepository) Update(luc string, model Apolice) (Apolice, error) {
	row := r.db.QueryRow(
		fmt.Sprintf(`UPDATE %s
		 SET luc = $1, loja = $2, segmento = $3, seguradora = $4, vigencia = $5, vencimento = $6, status = $7, cobertura = $8
		 WHERE luc = $9
		 RETURNING luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura`, tableName),
		model.Luc,
		model.Loja,
		model.Segmento,
		model.Seguradora,
		model.Vigencia,
		model.Vencimento,
		model.Status,
		model.Cobertura,
		luc,
	)

	return scanApolice(row)
}

func (r *PostgresRepository) Delete(luc string) error {
	res, err := r.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE luc = $1`, tableName), luc)
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

func scanApolice(scanner interface{ Scan(...any) error }) (Apolice, error) {
	var item Apolice
	var vigencia sql.NullTime
	var vencimento sql.NullTime
	var loja sql.NullString
	var segmento sql.NullString
	var seguradora sql.NullString
	var status sql.NullString
	var cobertura sql.NullFloat64

	if err := scanner.Scan(&item.Luc, &loja, &segmento, &seguradora, &vigencia, &vencimento, &status, &cobertura); err != nil {
		return Apolice{}, err
	}

	item.Loja = strings.TrimSpace(loja.String)
	item.Segmento = strings.TrimSpace(segmento.String)
	item.Seguradora = strings.TrimSpace(seguradora.String)
	item.Vigencia = vigencia.Time
	item.Vencimento = vencimento.Time
	item.Status = strings.TrimSpace(status.String)
	item.Cobertura = cobertura.Float64

	return item, nil
}