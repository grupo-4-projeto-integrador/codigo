-- Add responsavel column to seguros table
ALTER TABLE seguros ADD COLUMN IF NOT EXISTS responsavel VARCHAR(200);

-- Populate with a default value for existing rows
UPDATE seguros SET responsavel = 'Equipe de Seguros' WHERE responsavel IS NULL OR responsavel = '';
