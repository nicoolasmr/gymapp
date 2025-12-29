-- ============================================
-- 🕵️ VERIFICAÇÃO DE DEPLOY (AUDITORIA)
-- ============================================
-- Rode este script para garantir que o ambiente de produção está seguro e correto.

DO $$
DECLARE
    v_missing_tables TEXT := '';
    v_missing_buckets TEXT := '';
    v_rls_disabled TEXT := '';
    v_count INT;
BEGIN
    RAISE NOTICE '=== INICIANDO AUDITORIA ===';

    -- 1. Verificar Tabelas Críticas
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academies') THEN v_missing_tables := v_missing_tables || 'academies, '; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitions') THEN v_missing_tables := v_missing_tables || 'competitions, '; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competition_participants') THEN v_missing_tables := v_missing_tables || 'competition_participants, '; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkins') THEN v_missing_tables := v_missing_tables || 'checkins, '; END IF;

    IF length(v_missing_tables) > 0 THEN
        RAISE EXCEPTION '❌ TABELAS FALTANDO: %', v_missing_tables;
    ELSE
        RAISE NOTICE '✅ Estrutura de Tabelas: OK';
    END IF;

    -- 2. Verificar Buckets de Storage
    -- (Nota: Em PL/pgSQL puro é difícil checar buckets sem permissão de superuser em 'storage.buckets', 
    --  mas vamos tentar uma query simples se o user tiver permissão, senão assumimos aviso)
    BEGIN
        SELECT COUNT(*) INTO v_count FROM storage.buckets WHERE id IN ('academy-logos', 'academy-photos', 'public');
        IF v_count < 3 THEN
             RAISE WARNING '⚠️ Possíveis buckets faltando. Esperado: academy-logos, academy-photos, public. Encontrado: %', v_count;
        ELSE
             RAISE NOTICE '✅ Buckets de Storage: OK';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ Não foi possível verificar buckets (sem permissão). Verifique manualmente.';
    END;

    -- 3. Verificar RLS (Segurança)
    SELECT string_agg(tablename, ', ') INTO v_rls_disabled
    FROM pg_tables
    WHERE schemaname = 'public' 
    AND rowsecurity = false
    AND tablename IN ('academies', 'competitions', 'checkins', 'competition_participants', 'users');

    IF v_rls_disabled IS NOT NULL THEN
        RAISE WARNING '⚠️ ATENÇÃO: RLS Desativado nas tabelas: %', v_rls_disabled;
        RAISE WARNING '   -> Isso é perigoso para produção. Execute SUPABASE_SCHEMA_FINAL_CLEAN.sql novamente.';
    ELSE
        RAISE NOTICE '✅ Segurança RLS: ATIVA em todas as tabelas críticas.';
    END IF;

    -- 4. Verificar Constraint Única (Bug do "Entrar 2x")
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_competition_participant'
    ) THEN
        RAISE EXCEPTION '❌ ERRO CRÍTICO: Constraint "unique_competition_participant" não encontrada. O bug de duplicação pode ocorrer.';
    ELSE
        RAISE NOTICE '✅ Correção de Duplicação: APLICADA.';
    END IF;

    RAISE NOTICE '=== AUDITORIA CONCLUÍDA COM SUCESSO ===';
END $$;
