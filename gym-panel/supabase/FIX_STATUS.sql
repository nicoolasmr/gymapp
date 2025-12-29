-- ============================================
-- 🔧 CORREÇÃO: Garantir campo status existe
-- ============================================
-- Execute este SQL no Supabase

-- Adicionar campo status se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'academies' AND column_name = 'status'
    ) THEN
        ALTER TABLE academies ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;
END $$;

-- Atualizar academias existentes sem status
UPDATE academies 
SET status = 'draft' 
WHERE status IS NULL;

-- Verificar se a coluna existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'academies' AND column_name = 'status';
