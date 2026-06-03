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
	GetHistoricoGlobal(limit int) ([]HistoricoApolice, error)
	GetDocumentoByID(id string) (Documento, error)
	GetDocumentosByApolice(luc string) ([]Documento, error)
	CreateDocumento(doc Documento) (Documento, error)
	GetAtividadesRecentes(limit int) ([]AtividadeRecente, error)
	UpdateObservacoes(luc string, observacoes string) error
	Renovar(luc string, novoVencimento time.Time, novoValor float64, ator string, descricao string) error
	GetLojas() ([]LojaInfo, error)
}

type AtividadeRecente struct {
	ID          string    `json:"id"`
	Luc         string    `json:"luc"`
	NomeLoja    string    `json:"nome_loja"`
	Acao        string    `json:"acao"`
	Responsavel string    `json:"responsavel"`
	Timestamp   time.Time `json:"timestamp"`
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
	tx, err := r.db.Begin()
	if err != nil {
		return Apolice{}, err
	}
	defer tx.Rollback()

	row := tx.QueryRow(
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

	created, err := scanApolice(row)
	if err != nil {
		return Apolice{}, err
	}

	if err := r.insertHistoricoTx(tx, model.Luc, "Apólice criada", "Sistema"); err != nil {
		return Apolice{}, err
	}

	if err := tx.Commit(); err != nil {
		return Apolice{}, err
	}

	return created, nil
}

func (r *PostgresRepository) Update(luc string, model Apolice) (Apolice, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return Apolice{}, err
	}
	defer tx.Rollback()

	row := tx.QueryRow(
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

	updated, err := scanApolice(row)
	if err != nil {
		return Apolice{}, err
	}

	if err := r.insertHistoricoTx(tx, updated.Luc, "Apólice atualizada", "Sistema"); err != nil {
		return Apolice{}, err
	}

	if err := tx.Commit(); err != nil {
		return Apolice{}, err
	}

	return updated, nil
}

func (r *PostgresRepository) Delete(luc string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec(fmt.Sprintf(`UPDATE %s SET deleted_at = CURRENT_TIMESTAMP WHERE luc = $1 AND deleted_at IS NULL`, tableName), luc)
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

	if err := r.insertHistoricoTx(tx, luc, "Apólice excluída", "Sistema"); err != nil {
		return err
	}

	return tx.Commit()
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

func (r *PostgresRepository) GetHistoricoGlobal(limit int) ([]HistoricoApolice, error) {
	if limit < 1 {
		limit = 10
	}

	rows, err := r.db.Query(`SELECT id, apolice_luc, data, descricao, ator FROM historico_apolice ORDER BY data DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]HistoricoApolice, 0, limit)
	for rows.Next() {
		var item HistoricoApolice
		if err := rows.Scan(&item.ID, &item.ApoliceLuc, &item.Data, &item.Descricao, &item.Ator); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *PostgresRepository) GetAtividadesRecentes(limit int) ([]AtividadeRecente, error) {
	if limit < 1 {
		limit = 5
	}

	query := `
		SELECT
			h.id,
			h.apolice_luc,
			COALESCE(s.loja, h.apolice_luc) AS nome_loja,
			CASE
				WHEN lower(h.descricao) LIKE '%criada%' THEN 'criada'
				WHEN lower(h.descricao) LIKE '%atualizada%' OR lower(h.descricao) LIKE '%edi%' THEN 'editada'
				WHEN lower(h.descricao) LIKE '%renov%' THEN 'renovada'
				WHEN lower(h.descricao) LIKE '%exclu%' THEN 'excluida'
				WHEN lower(h.descricao) LIKE '%observa%' THEN 'observacoes'
				ELSE 'editada'
			END AS acao,
			h.ator,
			h.data
		FROM historico_apolice h
		LEFT JOIN seguros s ON s.luc = h.apolice_luc
		ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
		LIMIT $1`
	rows, err := r.db.Query(query, limit)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "does not exist") {
			return []AtividadeRecente{}, nil
		}
		return nil, err
	}
	defer rows.Close()

	items := make([]AtividadeRecente, 0, limit)
	for rows.Next() {
		var item AtividadeRecente
		if err := rows.Scan(&item.ID, &item.Luc, &item.NomeLoja, &item.Acao, &item.Responsavel, &item.Timestamp); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *PostgresRepository) UpdateObservacoes(luc string, observacoes string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec(fmt.Sprintf(`UPDATE %s SET observacoes = $1 WHERE luc = $2`, tableName), observacoes, luc)
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

	if err := r.insertHistoricoTx(tx, luc, "Observações atualizadas", "Sistema"); err != nil {
		return err
	}

	return tx.Commit()
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

	if err := r.insertHistoricoTx(tx, luc, descricao, ator); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresRepository) insertHistoricoTx(tx *sql.Tx, luc string, descricao string, ator string) error {
	if strings.TrimSpace(ator) == "" {
		ator = "João Carlos"
	}

	_, err := tx.Exec(`INSERT INTO historico_apolice (apolice_luc, data, descricao, ator) VALUES ($1, NOW(), $2, $3)`, luc, descricao, ator)
	return err
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

func (r *PostgresRepository) GetDocumentoByID(id string) (Documento, error) {
	var doc Documento
	var deletedAt sql.NullTime
	err := r.db.QueryRow(`SELECT id, apolice_luc, nome, arquivo_path, data_adicao, deleted_at FROM documentos WHERE id = $1`, id).Scan(&doc.ID, &doc.ApoliceLuc, &doc.Nome, &doc.ArquivoPath, &doc.DataAdicao, &deletedAt)
	if err != nil {
		return doc, err
	}
	if deletedAt.Valid {
		doc.DeletedAt = &deletedAt.Time
	}
	return doc, nil
}



func (r *PostgresRepository) GetDocumentosByApolice(luc string) ([]Documento, error) {
	rows, err := r.db.Query(`SELECT id, apolice_luc, nome, arquivo_path, data_adicao, deleted_at FROM documentos WHERE apolice_luc = $1`, luc)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Documento
	for rows.Next() {
		var item Documento
		var deletedAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.ApoliceLuc, &item.Nome, &item.ArquivoPath, &item.DataAdicao, &deletedAt); err != nil {
			return nil, err
		}
		if deletedAt.Valid {
			item.DeletedAt = &deletedAt.Time
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *PostgresRepository) CreateDocumento(doc Documento) (Documento, error) {
	query := `
		INSERT INTO documentos (apolice_luc, nome, arquivo_path)
		VALUES ($1, $2, $3)
		RETURNING id, data_adicao
	`
	err := r.db.QueryRow(query, doc.ApoliceLuc, doc.Nome, doc.ArquivoPath).Scan(&doc.ID, &doc.DataAdicao)
	if err != nil {
		return Documento{}, err
	}
	return doc, nil
}


