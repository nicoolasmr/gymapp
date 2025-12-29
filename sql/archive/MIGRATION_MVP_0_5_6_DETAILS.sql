-- ============================================================================
-- MIGRATION: MVP 0.5.6 - DETALHES RICOS DA ACADEMIA
-- Descrição: Adiciona suporte a fotos, descrição longa, regras e contatos
-- ============================================================================

ALTER TABLE academies
ADD COLUMN IF NOT EXISTS description TEXT, -- Sobre a academia
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb, -- Array de URLs de fotos
ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]'::jsonb, -- Array de regras (ex: "Obrigatório toalha")
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '{}'::jsonb; -- Objeto { "phone": "...", "instagram": "..." }

-- Notificação
DO $$
BEGIN
    RAISE NOTICE '✅ Migração MVP 0.7 concluída: Campos de detalhes adicionados.';
END $$;
