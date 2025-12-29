-- CORREÇÃO FINAL: GARANTIR RETORNO ÚNICO
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
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.address,
        a.modality::TEXT,
        a.active,
        COALESCE(a.photos, '[]'::jsonb),
        COALESCE(a.rules, '[]'::jsonb),
        COALESCE(a.amenities, '[]'::jsonb),
        COALESCE(a.opening_hours, '{}'::jsonb),
        COALESCE(a.contacts, '{}'::jsonb),
        a.custom_repasse_value,
        a.logo_url
    FROM academies a
    WHERE a.owner_id = auth.uid()
    LIMIT 1; -- OBRIGATÓRIO: Garante que nunca retorne mais de 1 linha
END;
$$ LANGUAGE plpgsql;

-- Verificação de Duplicatas (apenas informativo)
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT count(*) INTO v_count
    FROM academies
    WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'nicoolascf5@gmail.com');
    
    IF v_count > 1 THEN
        RAISE NOTICE '⚠️ ALERTA: O usuário tem % academias vinculadas! O sistema usará apenas a primeira.', v_count;
    ELSE
        RAISE NOTICE '✅ OK: O usuário tem % academia(s) vinculada(s).', v_count;
    END IF;
END $$;
