-- ============================================================================
-- MIGRATION: MVP 0.5.9 - STORAGE SETUP
-- Descrição: Configuração do Storage para fotos das academias
-- ============================================================================

-- 1. Criar bucket 'academy-photos' (se não existir)
-- Nota: Em alguns ambientes Supabase, a criação de buckets via SQL pode exigir permissões especiais.
-- Se falhar, crie manualmente no painel Storage > New Bucket > "academy-photos" (Public).
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-photos', 'academy-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Remover policies antigas para evitar conflitos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Partners can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Partners can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Partners can delete own photos" ON storage.objects;

-- 3. Policy: Leitura pública (qualquer um pode ver as fotos)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'academy-photos' );

-- 4. Policy: Upload para usuários autenticados (Parceiros)
CREATE POLICY "Partners can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'academy-photos' );

-- 5. Policy: Update/Delete apenas pelo próprio usuário (quem fez o upload)
CREATE POLICY "Partners can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'academy-photos' AND owner = auth.uid() );

CREATE POLICY "Partners can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'academy-photos' AND owner = auth.uid() );

-- Notificação
DO $$
BEGIN
    RAISE NOTICE '✅ Migração MVP 0.5.9 concluída: Bucket academy-photos configurado.';
END $$;
