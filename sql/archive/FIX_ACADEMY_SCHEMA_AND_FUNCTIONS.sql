-- FIX: Converter colunas para JSONB e corrigir funções
-- Isso resolve o conflito de tipos entre TEXT[] e JSONB reportado no erro.

-- 1. Converter colunas da tabela academies para JSONB
-- Primeiro removemos os valores DEFAULT antigos que podem estar causando conflito de tipo
ALTER TABLE academies ALTER COLUMN photos DROP DEFAULT;
ALTER TABLE academies ALTER COLUMN rules DROP DEFAULT;
ALTER TABLE academies ALTER COLUMN amenities DROP DEFAULT;
ALTER TABLE academies ALTER COLUMN opening_hours DROP DEFAULT;

-- Agora convertemos os tipos
ALTER TABLE academies ALTER COLUMN photos TYPE JSONB USING to_jsonb(photos);
ALTER TABLE academies ALTER COLUMN rules TYPE JSONB USING to_jsonb(rules);

-- Garantir que amenities e opening_hours existem e converter também
ALTER TABLE academies ADD COLUMN IF NOT EXISTS amenities JSONB;
ALTER TABLE academies ALTER COLUMN amenities TYPE JSONB USING to_jsonb(amenities);

ALTER TABLE academies ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE academies ALTER COLUMN opening_hours TYPE JSONB USING to_jsonb(opening_hours);

-- Por fim, definimos os novos DEFAULTs corretos (JSONB)
ALTER TABLE academies ALTER COLUMN photos SET DEFAULT '[]'::jsonb;
ALTER TABLE academies ALTER COLUMN rules SET DEFAULT '[]'::jsonb;
ALTER TABLE academies ALTER COLUMN amenities SET DEFAULT '[]'::jsonb;
ALTER TABLE academies ALTER COLUMN opening_hours SET DEFAULT '{}'::jsonb;

-- 2. Recriar função get_my_academy com os tipos corretos
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
        a.modality::TEXT, -- Cast para TEXT (pois modality é ENUM)
        a.active,
        a.photos,         -- Agora garantido como JSONB
        a.rules,          -- Agora garantido como JSONB
        a.amenities,      -- Agora garantido como JSONB
        a.opening_hours,  -- Agora garantido como JSONB
        a.contacts,
        a.custom_repasse_value,
        a.logo_url
    FROM academies a
    WHERE a.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
