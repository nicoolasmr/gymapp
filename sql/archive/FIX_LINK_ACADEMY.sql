-- ============================================================================
-- FIX: VINCULAR USUÁRIO À ACADEMIA (FORÇADO)
-- Descrição: Garante que o usuário nicoolascf5@gmail.com seja dono de uma academia
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_academy_id UUID;
BEGIN
    -- 1. Buscar o ID do usuário pelo email (na tabela auth.users ou public.users)
    -- Tenta pegar de public.users primeiro, que é o que usamos nas queries
    SELECT id INTO v_user_id FROM users WHERE email = 'nicoolascf5@gmail.com';
    
    -- Se não achar, tenta pegar de auth.users (caso o sync tenha falhado)
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'nicoolascf5@gmail.com';
    END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário nicoolascf5@gmail.com não encontrado!';
    END IF;

    -- 2. Garantir que o usuário é 'partner' ou 'admin'
    UPDATE public.users 
    SET role = 'partner' 
    WHERE id = v_user_id AND role = 'user';

    -- 3. Pegar a primeira academia disponível
    SELECT id INTO v_academy_id FROM academies LIMIT 1;

    IF v_academy_id IS NULL THEN
        -- Se não existir academia, cria uma
        INSERT INTO academies (name, address, active, owner_id)
        VALUES ('Academia Evolve (Sua Academia)', 'Rua Exemplo, 123', true, v_user_id)
        RETURNING id INTO v_academy_id;
        
        RAISE NOTICE 'Academia criada e vinculada ao usuário %', v_user_id;
    ELSE
        -- Se existir, atualiza o dono
        UPDATE academies 
        SET owner_id = v_user_id 
        WHERE id = v_academy_id;
        
        RAISE NOTICE 'Academia % vinculada ao usuário %', v_academy_id, v_user_id;
    END IF;

END $$;
