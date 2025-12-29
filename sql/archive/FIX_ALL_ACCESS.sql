-- SCRIPT DE CORREÇÃO FINAL DE ACESSO
-- 1. Recriar a função com proteção contra NULL e Casting explícito
CREATE OR REPLACE FUNCTION get_my_academy()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    address TEXT,
    modality TEXT,
    active BOOLEAN,
    photos JSONB,
    rules JSONB,
    amenities JSONB,
    opening_hours JSONB,
    contacts JSONB,
    custom_repasse_value NUMERIC,
    logo_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.address,
        a.modality::TEXT,
        a.active,
        COALESCE(a.photos, '[]'::jsonb) as photos,
        COALESCE(a.rules, '[]'::jsonb) as rules,
        COALESCE(a.amenities, '[]'::jsonb) as amenities,
        COALESCE(a.opening_hours, '{}'::jsonb) as opening_hours,
        COALESCE(a.contacts, '{}'::jsonb) as contacts,
        a.custom_repasse_value,
        a.logo_url
    FROM academies a
    WHERE a.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir permissões de execução para o usuário logado
GRANT EXECUTE ON FUNCTION get_my_academy() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_academy() TO service_role;

-- 3. Garantir permissões na tabela
GRANT ALL ON TABLE academies TO authenticated;
GRANT ALL ON TABLE academies TO service_role;

-- 4. Confirmação visual
DO $$
DECLARE
    v_user_email TEXT := 'nicoolascf5@gmail.com';
    v_academy_name TEXT;
BEGIN
    SELECT a.name INTO v_academy_name
    FROM academies a
    JOIN auth.users u ON a.owner_id = u.id
    WHERE u.email = v_user_email;
    
    IF v_academy_name IS NOT NULL THEN
        RAISE NOTICE '✅ SUCESSO: O usuário % é dono da academia "%"', v_user_email, v_academy_name;
    ELSE
        RAISE NOTICE '❌ ERRO: Usuário não encontrado ou sem academia vinculada!';
    END IF;
END $$;
