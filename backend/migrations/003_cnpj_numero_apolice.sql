-- Migration: add cnpj and numero_apolice to seguros table
-- These are optional fields — zero breaking changes, LUC remains the PK.

ALTER TABLE seguros ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18) DEFAULT NULL;
ALTER TABLE seguros ADD COLUMN IF NOT EXISTS numero_apolice VARCHAR(50) DEFAULT NULL;

-- Generate realistic CNPJs for existing rows (idempotent via CASE)
-- Format: XX.XXX.XXX/0001-XX (we generate fake but format-valid ones)
UPDATE seguros
SET cnpj = CASE
    WHEN cnpj IS NULL THEN
        LPAD((floor(random() * 89 + 10)::int)::text, 2, '0') || '.' ||
        LPAD((floor(random() * 899 + 100)::int)::text, 3, '0') || '.' ||
        LPAD((floor(random() * 899 + 100)::int)::text, 3, '0') || '/0001-' ||
        LPAD((floor(random() * 89 + 10)::int)::text, 2, '0')
    ELSE cnpj
END
WHERE cnpj IS NULL;

-- Generate numero_apolice in format APL-YYYY-XXXXXX
UPDATE seguros
SET numero_apolice = CASE
    WHEN numero_apolice IS NULL THEN
        'APL-' ||
        EXTRACT(YEAR FROM COALESCE(vigencia, NOW()))::text || '-' ||
        LPAD((floor(random() * 999999 + 1)::int)::text, 6, '0')
    ELSE numero_apolice
END
WHERE numero_apolice IS NULL;
