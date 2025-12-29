-- ============================================================================
-- MIGRATION: MVP 0.5.8 - PARTNER SELF-SERVICE PERMISSIONS
-- Descrição: RLS e funções para parceiros gerenciarem suas academias
-- ============================================================================

-- 1. ADICIONAR COLUNA owner_id SE NÃO EXISTIR
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- 2. RLS POLICY: Partners podem ver apenas suas academias
DROP POLICY IF EXISTS "partners_view_own_academy" ON academies;
CREATE POLICY "partners_view_own_academy"
ON academies FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- 3. RLS POLICY: Partners podem editar apenas suas academias
DROP POLICY IF EXISTS "partners_update_own_academy" ON academies;
CREATE POLICY "partners_update_own_academy"
ON academies FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 4. FUNCTION: Partner atualiza sua academia
CREATE OR REPLACE FUNCTION update_academy_self(
    p_academy_id UUID,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_photos JSONB DEFAULT NULL,
    p_rules JSONB DEFAULT NULL,
    p_amenities JSONB DEFAULT NULL,
    p_opening_hours JSONB DEFAULT NULL,
    p_contacts JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- Verificar se o usuário é dono da academia
    SELECT owner_id INTO v_owner_id
    FROM academies
    WHERE id = p_academy_id;
    
    IF v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Você não tem permissão para editar esta academia.';
    END IF;
    
    -- Atualizar apenas campos permitidos (não pode mudar modality, active, custom_repasse)
    UPDATE academies SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        address = COALESCE(p_address, address),
        photos = COALESCE(p_photos, photos),
        rules = COALESCE(p_rules, rules),
        amenities = COALESCE(p_amenities, amenities),
        opening_hours = COALESCE(p_opening_hours, opening_hours),
        contacts = COALESCE(p_contacts, contacts),
        updated_at = NOW()
    WHERE id = p_academy_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCTION: Obter academia do partner logado
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
    custom_repasse_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.address,
        a.modality,
        a.active,
        a.photos,
        a.rules,
        a.amenities,
        a.opening_hours,
        a.contacts,
        a.custom_repasse_value
    FROM academies a
    WHERE a.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notificação
DO $$
BEGIN
    RAISE NOTICE '✅ Migração MVP 0.5.8 concluída: Permissões de Partner criadas.';
END $$;
