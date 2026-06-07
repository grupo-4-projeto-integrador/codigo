-- Migration: Sistema Multi-Usuário com Roles (002)
-- Totalmente idempotente: usa IF NOT EXISTS e DO $$ para cada passo

-- 1. Habilitar extensão pgcrypto para funções bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ajustar colunas da tabela usuarios
ALTER TABLE usuarios ALTER COLUMN nome TYPE VARCHAR(100);
ALTER TABLE usuarios ALTER COLUMN email TYPE VARCHAR(150);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='senha_hash'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN senha_hash VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='role'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'visualizador';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='avatar_url'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN avatar_url VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='ativo'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN ativo BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='updated_at'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END;
$$;

-- Migrar created_at para TIMESTAMPTZ se ainda for TIMESTAMP sem fuso
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='created_at' AND data_type='timestamp without time zone'
  ) THEN
    ALTER TABLE usuarios ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'America/Sao_Paulo';
  END IF;
END;
$$;

-- 3. Adicionar constraint CHECK de role (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_role_check' AND conrelid = 'usuarios'::regclass
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_role_check
      CHECK (role IN ('admin', 'gestor', 'visualizador'));
  END IF;
END;
$$;

-- 4. Adicionar responsavel_id em seguros se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='seguros' AND column_name='responsavel_id'
  ) THEN
    ALTER TABLE seguros
      ADD COLUMN responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
  ELSE
    -- Coluna existe: garantir que é INTEGER (pode ter sido criada como BIGINT antes)
    -- Recriar FK corretamente
    ALTER TABLE seguros DROP CONSTRAINT IF EXISTS seguros_responsavel_id_fkey;
    ALTER TABLE seguros ALTER COLUMN responsavel_id TYPE INTEGER USING responsavel_id::integer;
    ALTER TABLE seguros
      ADD CONSTRAINT seguros_responsavel_id_fkey
      FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- 5. Seed: 3 usuários (um por role)
INSERT INTO usuarios (nome, email, senha_hash, role) VALUES
  ('João Carlos', 'joao@flamboyant.com', crypt('admin123', gen_salt('bf')), 'admin'),
  ('Maria Silva', 'maria@flamboyant.com', crypt('gestor123', gen_salt('bf')), 'gestor'),
  ('Pedro Lima',  'pedro@flamboyant.com', crypt('viewer123', gen_salt('bf')), 'visualizador')
ON CONFLICT (email) DO UPDATE
  SET senha_hash = EXCLUDED.senha_hash,
      role       = EXCLUDED.role,
      updated_at = NOW();
