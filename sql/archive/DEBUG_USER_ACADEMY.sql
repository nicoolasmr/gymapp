-- VERIFICAÇÃO DE INTEGRIDADE (DEBUG)

-- 1. Pegar ID do usuário Nicolas
DO $$
DECLARE
    _user_id UUID;
    _academy_id UUID;
BEGIN
    SELECT id INTO _user_id FROM users WHERE email = 'nicoolascf5@gmail.com';
    
    IF _user_id IS NULL THEN
        RAISE NOTICE 'Usuário Nicolas NÃO encontrado na tabela users!';
    ELSE
        RAISE NOTICE 'Usuário Nicolas ID: %', _user_id;
    END IF;

    -- 2. Verificar se ele é dono de alguma academia
    SELECT id INTO _academy_id FROM academies WHERE owner_id = _user_id;

    IF _academy_id IS NULL THEN
        RAISE NOTICE 'Usuário Nicolas NÃO é dono de nenhuma academia!';
        
        -- Tentar corrigir: Pegar a primeira academia e dar para ele
        SELECT id INTO _academy_id FROM academies LIMIT 1;
        
        IF _academy_id IS NOT NULL THEN
            UPDATE academies SET owner_id = _user_id WHERE id = _academy_id;
            RAISE NOTICE 'CORREÇÃO APLICADA: Academia % agora pertence ao Nicolas.', _academy_id;
        END IF;
    ELSE
        RAISE NOTICE 'Usuário Nicolas é dono da academia ID: %', _academy_id;
    END IF;
END $$;
