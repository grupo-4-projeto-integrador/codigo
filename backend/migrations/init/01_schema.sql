CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'visualizador'
        CONSTRAINT usuarios_role_check CHECK (role IN ('admin', 'gestor', 'visualizador')),
    avatar_url VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usuarios OWNER TO postgres;

CREATE TABLE IF NOT EXISTS seguros (
    luc character varying NOT NULL,
    loja character varying,
    segmento character varying,
    seguradora character varying,
    vigencia date,
    vencimento date,
    status character varying,
    cobertura numeric DEFAULT 0,
    responsavel character varying DEFAULT '',
    responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    observacoes text DEFAULT '',
    deleted_at timestamp DEFAULT NULL
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

ALTER TABLE historico_apolice OWNER TO postgres;

CREATE TABLE IF NOT EXISTS coberturas (
    id SERIAL PRIMARY KEY,
    apolice_luc VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor NUMERIC NOT NULL
);

ALTER TABLE coberturas OWNER TO postgres;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL DEFAULT 'sistema',
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    entidade_id VARCHAR(255) NOT NULL DEFAULT '',
    payload_anterior JSONB,
    payload_novo JSONB,
    ip VARCHAR(45) NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs OWNER TO postgres;
