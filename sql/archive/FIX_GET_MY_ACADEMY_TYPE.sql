-- FIX: Corrigir tipo de retorno da função get_my_academy
-- O erro "Returned type academy_modality does not match expected type text" ocorre porque o campo modality é um ENUM e a função espera TEXT.
-- Solução: Fazer o cast explícito a.modality::TEXT

DROP FUNCTION IF EXISTS get_my_academy();

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
        a.modality::TEXT, -- Cast explícito para TEXT para evitar erro de tipo
        a.active,
        a.photos,
        a.rules,
        a.amenities,
        a.opening_hours,
        a.contacts,
        a.custom_repasse_value,
        a.logo_url
    FROM academies a
    WHERE a.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
