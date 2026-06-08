package notificacao

import (
	"database/sql"
	"fmt"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// SyncNotificacoes garante que as notificações vencidas e a_vencer estejam geradas para o usuário.
func (r *PostgresRepository) SyncNotificacoes(usuarioID int) error {
	// Insere "vencida" para apólices vencidas (< 0 dias), se não houver uma não-arquivada para a apólice/usuário
	queryVencidas := `
		INSERT INTO notificacoes (usuario_id, apolice_luc, tipo)
		SELECT $1, s.luc, 'vencida'
		FROM seguros s
		WHERE CURRENT_DATE > s.vencimento
		ON CONFLICT (usuario_id, apolice_luc, tipo) WHERE arquivada = FALSE
		DO NOTHING;
	`
	if _, err := r.db.Exec(queryVencidas, usuarioID); err != nil {
		return fmt.Errorf("erro ao sincronizar vencidas: %w", err)
	}

	// Insere "a_vencer" para apólices a vencer (>= 0 e <= 30 dias), se não houver
	queryAVencer := `
		INSERT INTO notificacoes (usuario_id, apolice_luc, tipo)
		SELECT $1, s.luc, 'a_vencer'
		FROM seguros s
		WHERE CURRENT_DATE <= s.vencimento AND (s.vencimento - CURRENT_DATE) <= 30
		ON CONFLICT (usuario_id, apolice_luc, tipo) WHERE arquivada = FALSE
		DO NOTHING;
	`
	if _, err := r.db.Exec(queryAVencer, usuarioID); err != nil {
		return fmt.Errorf("erro ao sincronizar a_vencer: %w", err)
	}

	// Se uma apólice foi renovada (dias > 30), podemos querer arquivar automaticamente as notificações passadas.
	queryArquivarRenovadas := `
		UPDATE notificacoes n
		SET arquivada = TRUE
		FROM seguros s
		WHERE n.apolice_luc = s.luc AND n.usuario_id = $1 AND n.arquivada = FALSE
		  AND ((n.tipo = 'vencida' AND CURRENT_DATE <= s.vencimento)
		       OR (n.tipo = 'a_vencer' AND (s.vencimento - CURRENT_DATE) > 30));
	`
	if _, err := r.db.Exec(queryArquivarRenovadas, usuarioID); err != nil {
		return fmt.Errorf("erro ao arquivar renovadas automaticamente: %w", err)
	}

	return nil
}

// GetNotificacoes retorna as notificações ativas (não arquivadas) do usuário.
func (r *PostgresRepository) GetNotificacoes(usuarioID int) ([]Notificacao, error) {
	query := `
		SELECT 
			n.id, 
			n.apolice_luc, 
			n.tipo, 
			n.lida, 
			COALESCE(s.loja, n.apolice_luc) AS loja,
			COALESCE(s.segmento, s.tipo, 'Geral') AS cobertura,
			s.vencimento - CURRENT_DATE AS dias
		FROM notificacoes n
		LEFT JOIN seguros s ON s.luc = n.apolice_luc
		WHERE n.usuario_id = $1 AND n.arquivada = FALSE
		ORDER BY n.created_at DESC
	`
	rows, err := r.db.Query(query, usuarioID)
	if err != nil {
		return nil, fmt.Errorf("query notificacoes erro: %w", err)
	}
	defer rows.Close()

	var list []Notificacao
	for rows.Next() {
		var n Notificacao
		var dias sql.NullInt32
		if err := rows.Scan(&n.ID, &n.ApoliceLUC, &n.Tipo, &n.Lida, &n.Loja, &n.Cobertura, &dias); err != nil {
			return nil, err
		}
		if dias.Valid {
			// Para vencidas, a UI quer o número positivo de dias atrás. Para a vencer, positivo também.
			if dias.Int32 < 0 {
				n.Dias = int(-dias.Int32)
			} else {
				n.Dias = int(dias.Int32)
			}
		}
		list = append(list, n)
	}
	return list, nil
}

// MarcarTodasLidas
func (r *PostgresRepository) MarcarTodasLidas(usuarioID int) error {
	_, err := r.db.Exec(`UPDATE notificacoes SET lida = TRUE WHERE usuario_id = $1 AND lida = FALSE AND arquivada = FALSE`, usuarioID)
	return err
}

// ArquivarLidas
func (r *PostgresRepository) ArquivarLidas(usuarioID int) error {
	_, err := r.db.Exec(`UPDATE notificacoes SET arquivada = TRUE WHERE usuario_id = $1 AND lida = TRUE AND arquivada = FALSE`, usuarioID)
	return err
}

// ArquivarUnica
func (r *PostgresRepository) ArquivarUnica(usuarioID int, id int) error {
	_, err := r.db.Exec(`UPDATE notificacoes SET arquivada = TRUE WHERE usuario_id = $1 AND id = $2`, usuarioID, id)
	return err
}
