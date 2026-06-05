-- Audit Log: Registro imutável de todas as ações do sistema
-- Sistema gerencia R$400M em cobertura — compliance regulatório obrigatório

CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL DEFAULT 'sistema',
    acao        VARCHAR(100) NOT NULL,
    entidade    VARCHAR(100) NOT NULL,
    entidade_id VARCHAR(255) NOT NULL DEFAULT '',
    payload_anterior JSONB,
    payload_novo     JSONB,
    ip          VARCHAR(45)  NOT NULL DEFAULT '',
    user_agent  TEXT         NOT NULL DEFAULT '',
    timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices para filtros rápidos na página /admin/auditoria
CREATE INDEX IF NOT EXISTS idx_audit_timestamp    ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_acao         ON audit_logs (acao);
CREATE INDEX IF NOT EXISTS idx_audit_entidade     ON audit_logs (entidade);
CREATE INDEX IF NOT EXISTS idx_audit_entidade_id  ON audit_logs (entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id      ON audit_logs (user_id);

-- A tabela não permite UPDATE nem DELETE — apenas INSERT (imutabilidade)
-- Isso deve ser reforçado via REVOKE em produção:
-- REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
