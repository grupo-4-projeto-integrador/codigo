-- Initial schema for Seguros (generated from existing dump)
-- Creates the `public.new` table expected by the backend
-- Apply with: psql -U postgres -d seguros_db -f initial_schema.sql

CREATE TABLE IF NOT EXISTS public.new (
    luc character varying NOT NULL,
    fantasia character varying,
    segmento character varying,
    seguradora character varying,
    vigencia date,
    vencimento date,
    status character varying
);

ALTER TABLE public.new OWNER TO postgres;

-- NOTE: sample seed data is available in seguros-app/seguros.sql and seguros-app/database/Seguros.sql
-- You can import it using: psql -U postgres -d seguros_db -f ../../seguros-app/seguros.sql
