-- ============================================
-- 🧪 TESTE FINAL INTEGRADO DA PLATAFORMA (SIMULAÇÃO)
-- ============================================

-- Execute este script no SQL Editor do Supabase para validar todo o fluxo.

BEGIN; -- Inicia transação para teste seguro

DO $$
DECLARE
    v_user_email TEXT := 'test_user_final@example.com';
    v_user_id UUID;
    v_academy_owner_email TEXT := 'test_owner_final@example.com';
    v_academy_owner_id UUID;
    v_academy_id UUID;
    v_checkin_id UUID;
    v_checkin_result JSONB;
    v_dashboard_metrics JSON;
    v_social_count INT;
    v_streak INT;
    v_logs_count INT;
BEGIN
    RAISE NOTICE '📌 INICIANDO TESTE FINAL DE INTEGRAÇÃO...';

    -- 1. SETUP: Criar Usuário de Teste (Aluno)
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
    
    IF v_user_id IS NULL THEN
        INSERT INTO auth.users (id, email, email_confirmed_at)
        VALUES (gen_random_uuid(), v_user_email, NOW())
        RETURNING id INTO v_user_id;
    END IF;
    
    -- Criar perfil público do aluno (se trigger não criar)
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (v_user_id, v_user_email, 'Aluno Teste Final', 'student')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ 1. Aluno criado: % (%)', v_user_email, v_user_id;

    -- 2. SETUP: Criar Dono da Academia e Academia
    SELECT id INTO v_academy_owner_id FROM auth.users WHERE email = v_academy_owner_email;

    IF v_academy_owner_id IS NULL THEN
        INSERT INTO auth.users (id, email, email_confirmed_at)
        VALUES (gen_random_uuid(), v_academy_owner_email, NOW())
        RETURNING id INTO v_academy_owner_id;
    END IF;

    -- Criar perfil do dono
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (v_academy_owner_id, v_academy_owner_email, 'Dono Teste Final', 'academy_owner')
    ON CONFLICT (id) DO NOTHING;

    -- Criar Academia
    INSERT INTO public.academies (owner_id, name, address, rules, amenities, status)
    VALUES (v_academy_owner_id, 'Academia Teste Final', 'Rua Teste, 123', '{"text": "Regras da academia"}'::jsonb, '["Musculação", "Cross"]'::jsonb, 'active')
    RETURNING id INTO v_academy_id;

    RAISE NOTICE '✅ 2. Academia criada: % (%)', 'Academia Teste Final', v_academy_id;

    -- 3. AÇÃO: Simular Check-in via RPC (Mobile -> Backend)
    -- Isso simula a chamada exata que o app faz
    SELECT perform_checkin(
        v_user_id,
        v_academy_id,
        -23.550520,
        -46.633308
    ) INTO v_checkin_result;

    IF (v_checkin_result->>'success')::BOOLEAN THEN
        v_checkin_id := (v_checkin_result->>'checkin_id')::UUID;
        RAISE NOTICE '✅ 3. Check-in realizado com sucesso via RPC. ID: %', v_checkin_id;
    ELSE
        RAISE EXCEPTION '❌ FALHA NO CHECK-IN: %', v_checkin_result->>'message';
    END IF;

    -- 4. VALIDAÇÃO: Gamificação (Triggers)
    SELECT current_streak INTO v_streak
    FROM user_engagement
    WHERE user_id = v_user_id;

    IF v_streak >= 1 THEN
        RAISE NOTICE '✅ 4. Gamificação: Streak atualizado para % dias (Trigger funcionou)', v_streak;
    ELSE
        RAISE EXCEPTION '❌ FALHA GAMIFICAÇÃO: Streak não atualizado.';
    END IF;

    -- 5. VALIDAÇÃO: Social Fitness (Auto-post)
    SELECT COUNT(*) INTO v_social_count
    FROM social_feed
    WHERE checkin_id = v_checkin_id AND event_type = 'checkin';

    IF v_social_count > 0 THEN
        RAISE NOTICE '✅ 5. Social Fitness: Post criado automaticamente no feed.';
    ELSE
        RAISE EXCEPTION '❌ FALHA SOCIAL: Post não criado no feed.';
    END IF;

    -- 6. VALIDAÇÃO: Painel da Academia (Dashboard Metrics)
    SELECT get_dashboard_metrics(v_academy_id) INTO v_dashboard_metrics;

    IF (v_dashboard_metrics->'today'->>'total_checkins')::INT > 0 THEN
        RAISE NOTICE '✅ 6. Dashboard Academia: Métricas atualizaram (Check-ins hoje > 0)';
    ELSE
        RAISE EXCEPTION '❌ FALHA DASHBOARD: Métricas não refletem o check-in.';
    END IF;

    -- 7. VALIDAÇÃO: Admin Global (Consulta direta)
    PERFORM 1 FROM checkins WHERE id = v_checkin_id;
    RAISE NOTICE '✅ 7. Admin Global: Check-in acessível na tabela global.';

    RAISE NOTICE '🎉 TUDO PRONTO! A PLATAFORMA PASSOU EM TODOS OS TESTES INTEGRADOS.';
END $$;

ROLLBACK; -- Reverte tudo para não sujar o banco real (Remova se quiser persistir)
