ALTER TABLE seguros ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE seguros ADD COLUMN IF NOT EXISTS observacoes TEXT;

CREATE TABLE IF NOT EXISTS coberturas (
    id SERIAL PRIMARY KEY,
    apolice_luc VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS historico_apolice (
    id SERIAL PRIMARY KEY,
    apolice_luc VARCHAR(50) NOT NULL,
    data TIMESTAMP NOT NULL,
    descricao TEXT NOT NULL,
    ator VARCHAR(100) NOT NULL
);

TRUNCATE TABLE coberturas, historico_apolice, documentos RESTART IDENTITY;

-- Seed de usuários
INSERT INTO usuarios (id, nome, email) VALUES (1, 'João Carlos', 'joao.carlos@exemplo.com') ON CONFLICT (id) DO NOTHING;

-- Inserir alguns dados para as coberturas
INSERT INTO coberturas (apolice_luc, nome, descricao, valor)
SELECT luc, 'Incêndio, Raio e Explosão', 'Cobertura básica para danos físicos', cobertura * 1.0 FROM seguros;

INSERT INTO coberturas (apolice_luc, nome, descricao, valor)
SELECT luc, 'Danos Elétricos', 'Cobertura para danos a equipamentos elétricos', cobertura * 0.1 FROM seguros;

INSERT INTO coberturas (apolice_luc, nome, descricao, valor)
SELECT luc, 'Perda de Pagamento de Aluguel', 'Garante o pagamento de aluguel em caso de sinistro', cobertura * 0.2 FROM seguros;

-- Inserir alguns dados para o historico
INSERT INTO historico_apolice (apolice_luc, data, descricao, ator)
SELECT luc, vigencia, 'Emissão da Apólice', 'Sistema' FROM seguros;

INSERT INTO historico_apolice (apolice_luc, data, descricao, ator)
SELECT luc, vigencia + INTERVAL '10 days', 'Pagamento da Primeira Parcela Confirmado', 'Financeiro' FROM seguros;

-- Inserir documentos de teste
INSERT INTO documentos (apolice_luc, nome, arquivo_path)
SELECT luc, 'Apolice_Completa.pdf', 'apolices/teste/Apolice_Completa.pdf' FROM seguros;

INSERT INTO documentos (apolice_luc, nome, arquivo_path)
SELECT luc, 'Condicoes_Gerais.pdf', 'apolices/teste/Condicoes_Gerais.pdf' FROM seguros;
