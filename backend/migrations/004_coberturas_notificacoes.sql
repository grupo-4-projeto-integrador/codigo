CREATE TABLE IF NOT EXISTS coberturas (
    id SERIAL PRIMARY KEY,
    apolice_luc VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    apolice_luc VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    arquivada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notificacoes_unique_active 
ON notificacoes (usuario_id, apolice_luc, tipo) 
WHERE arquivada = FALSE;
