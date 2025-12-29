-- ============================================
-- 🧹 RESET & SEED PARA BETA TEST (CLEAN SLATE)
-- ============================================
-- ⚠️ ATENÇÃO: ESTE SCRIPT APAGARÁ DADOS!
-- Ele limpa check-ins, feeds, notificações e deixa apenas 1 ACADEMIA e 2 USUÁRIOS (Dono e Aluno) para teste manual.

BEGIN;

-- 1. LIMPEZA TOTAL DE DADOS OPERACIONAIS
RAISE NOTICE '🧹 Limpando dados operacionais (Check-ins, Feed, Gamificação)...';
TRUNCATE TABLE 
    social_feed_likes,
    social_feed_comments,
    social_feed,
    checkins,
    user_engagement,
    notifications,
    platform_events,
    pvp_challenges,
    community_posts,
    community_members,
    memberships,
    invoices
    CASCADE;

-- 2. LIMPEZA DE ENTIDADES (Opcional - Removemos tudo para recriar limpo)
RAISE NOTICE '🧹 Limpando Academias e Usuários antigos...';
DELETE FROM academies;
DELETE FROM users WHERE email NOT IN ('admin@antigravaty.com'); -- Mantém Super Admin se houver

-- 3. SEED: CRIAR USUÁRIOS DE TESTE
RAISE NOTICE '🌱 Criando Usuários de Teste...';

-- A) DONO DA ACADEMIA (dono@teste.com)
DO $$
DECLARE
    v_owner_id UUID;
    v_academy_id UUID;
    v_student_id UUID;
BEGIN
    -- --- CRIAR DONO ---
    -- Tenta achar user auth existente ou cria ID novo
    SELECT id INTO v_owner_id FROM auth.users WHERE email = 'dono@teste.com';
    
    IF v_owner_id IS NULL THEN
        v_owner_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, email_confirmed_at, raw_app_meta_data)
        VALUES (v_owner_id, 'dono@teste.com', NOW(), '{"provider":"email","providers":["email"]}')
        RETURNING id INTO v_owner_id;
    END IF;

    INSERT INTO public.users (id, email, full_name, role, avatar_url)
    VALUES (v_owner_id, 'dono@teste.com', 'Dono da Academia', 'academy_owner', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dono')
    ON CONFLICT (id) DO UPDATE SET role = 'academy_owner';

    -- --- CRIAR ACADEMIA ---
    RAISE NOTICE '🌱 Criando Academia BETA...';
    
    INSERT INTO public.academies (
        owner_id, 
        name, 
        address, 
        description, 
        rules, 
        amenities, 
        status, 
        logo_url,
        latitude,
        longitude
    )
    VALUES (
        v_owner_id, 
        'Academia Beta Prime', 
        'Av. Paulista, 1000 - São Paulo, SP', 
        'A melhor academia para o seu teste beta.',
        '{"text": "1. Guarde os pesos.\n2. Divirta-se."}'::jsonb, 
        '["Musculação", "Cross", "Yoga", "Luta"]'::jsonb, 
        'active',
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop',
        -23.561414, -- Av Paulista
        -46.655881
    )
    RETURNING id INTO v_academy_id;

    -- --- CRIAR ALUNO (aluno@teste.com) ---
    RAISE NOTICE '🌱 Criando Aluno...';
    
    SELECT id INTO v_student_id FROM auth.users WHERE email = 'aluno@teste.com';
    
    IF v_student_id IS NULL THEN
        v_student_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, email_confirmed_at, raw_app_meta_data)
        VALUES (v_student_id, 'aluno@teste.com', NOW(), '{"provider":"email","providers":["email"]}')
        RETURNING id INTO v_student_id;
    END IF;

    INSERT INTO public.users (id, email, full_name, role, avatar_url)
    VALUES (v_student_id, 'aluno@teste.com', 'Aluno Beta', 'student', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aluno')
    ON CONFLICT (id) DO UPDATE SET role = 'student';

    -- --- CRIAR MEMBERSHIP ATIVA ---
    INSERT INTO memberships (user_id, plan_id, status, start_date, end_date)
    VALUES (v_student_id, 1, 'active', NOW(), NOW() + INTERVAL '30 days'); -- Assumindo plan_id 1 existe, senão vai dar erro de FK. Se der erro, remova esta linha.

    RAISE NOTICE '✅ SETUP CONCLUÍDO!';
    RAISE NOTICE '🏢 Academia: Academia Beta Prime (ID: %)', v_academy_id;
    RAISE NOTICE '👤 Dono: dono@teste.com (ID: %)', v_owner_id;
    RAISE NOTICE '👤 Aluno: aluno@teste.com (ID: %)', v_student_id;
    RAISE NOTICE '📍 Local: Av. Paulista, 1000';

END $$;

COMMIT;
