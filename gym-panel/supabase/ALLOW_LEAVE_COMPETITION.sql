-- ============================================
-- 🔓 PERMITIR SAIR DE COMPETIÇÕES
-- ============================================
-- Adiciona política RLS para permitir que usuários excluam sua própria participação.

DO $$
BEGIN
    DROP POLICY IF EXISTS "Leave competition" ON competition_participants;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'competition_participants' AND policyname = 'Leave competition'
    ) THEN
        CREATE POLICY "Leave competition" ON competition_participants 
        FOR DELETE TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END $$;
