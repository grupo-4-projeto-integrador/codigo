CREATE INDEX IF NOT EXISTS idx_historico_apolice_luc ON historico_apolice (apolice_luc);
CREATE INDEX IF NOT EXISTS idx_historico_apolice_data ON historico_apolice (data DESC);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_logs (acao);
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_logs (entidade);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs (user_id);
