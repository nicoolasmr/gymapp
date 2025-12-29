-- RESET RLS POLICIES
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own academy" ON academies;
DROP POLICY IF EXISTS "Users can update their own academy" ON academies;
DROP POLICY IF EXISTS "Academies are viewable by everyone" ON academies;
DROP POLICY IF EXISTS "Public academies are viewable by everyone" ON academies;
DROP POLICY IF EXISTS "Owners can update their own academy" ON academies;

-- 1. Leitura: Todos podem ver todas as academias (necessário para o App Mobile)
CREATE POLICY "Public academies are viewable by everyone"
ON academies FOR SELECT
USING (true);

-- 2. Escrita/Atualização: Apenas o Dono pode editar sua academia
CREATE POLICY "Owners can update their own academy"
ON academies FOR UPDATE
USING (auth.uid() = owner_id);

-- 3. Função get_my_academy (reforçada)
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
    WHERE a.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- 4. Garantir permissões
GRANT EXECUTE ON FUNCTION get_my_academy() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_academy() TO service_role;
GRANT ALL ON TABLE academies TO authenticated;
GRANT ALL ON TABLE academies TO service_role;
