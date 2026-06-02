CREATE TABLE IF NOT EXISTS seguros (
    luc character varying NOT NULL,
    loja character varying,
    segmento character varying,
    seguradora character varying,
    vigencia date,
    vencimento date,
    status character varying,
    cobertura numeric DEFAULT 0
);

ALTER TABLE seguros OWNER TO postgres;

CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    apolice_luc VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    arquivo_path VARCHAR(500) NOT NULL,
    data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

ALTER TABLE documentos OWNER TO postgres;

CREATE TABLE IF NOT EXISTS historico_apolice (
    id SERIAL PRIMARY KEY,
    apolice_luc VARCHAR(50) NOT NULL,
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    descricao TEXT NOT NULL,
    ator VARCHAR(255) NOT NULL DEFAULT 'Sistema'
);

CREATE INDEX IF NOT EXISTS idx_historico_apolice_luc ON historico_apolice (apolice_luc);
CREATE INDEX IF NOT EXISTS idx_historico_apolice_data ON historico_apolice (data DESC);

ALTER TABLE historico_apolice OWNER TO postgres;

-- NOTE: sample seed data is available in seguros-app/seguros.sql and seguros-app/database/Seguros.sql
-- You can import it using: psql -U postgres -d seguros_db -f ../../seguros-app/seguros.sql
