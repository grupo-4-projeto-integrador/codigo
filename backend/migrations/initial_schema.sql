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

-- NOTE: sample seed data is available in seguros-app/seguros.sql and seguros-app/database/Seguros.sql
-- You can import it using: psql -U postgres -d seguros_db -f ../../seguros-app/seguros.sql
