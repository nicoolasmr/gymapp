-- FIX: Atualizar apenas a função get_my_academy
-- Execute este script para garantir que a função está usando os tipos corretos (JSONB e TEXT)

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
        a.modality::TEXT, -- Cast essencial para evitar erro de tipo ENUM
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
