DO $$
DECLARE
    target_user_id UUID;
    target_academy_id UUID;
BEGIN
    -- 1. Buscar ID do usuário pelo email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'nicoolascf5@gmail.com';

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário nicoolascf5@gmail.com não encontrado. Verifique se o email está correto.';
    END IF;

    -- 2. Buscar ID da academia pelo nome
    SELECT id INTO target_academy_id
    FROM public.academies
    WHERE name = 'Academia Teste MVP 0.3'
    LIMIT 1;

    -- 3. Lógica de Vinculação
    IF target_academy_id IS NOT NULL THEN
        -- Academia existe: Atualizar dono
        UPDATE public.academies
        SET owner_id = target_user_id
        WHERE id = target_academy_id;
        RAISE NOTICE 'Sucesso! O usuário % agora é dono da academia %', 'nicoolascf5@gmail.com', 'Academia Teste MVP 0.3';
    ELSE
        -- Academia NÃO existe: Criar uma nova para garantir o teste
        INSERT INTO public.academies (
            name, 
            description, 
            address, 
            modality, 
            active, 
            owner_id,
            photos,
            rules,
            amenities,
            opening_hours,
            contacts
        )
        VALUES (
            'Academia Teste MVP 0.3',
            'Academia de teste para validação do MVP 0.5',
            'Rua de Testes, 100 - Centro',
            'gym_standard',
            true,
            target_user_id,
            '[]'::jsonb,
            '[]'::jsonb,
            '[]'::jsonb,
            '{}'::jsonb,
            '{}'::jsonb
        );
        RAISE NOTICE 'Academia não encontrada, então foi CRIADA uma nova e vinculada ao usuário!';
    END IF;

END $$;
