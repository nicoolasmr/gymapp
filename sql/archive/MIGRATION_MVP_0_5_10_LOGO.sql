-- ============================================================================
-- MIGRATION: MVP 0.5.10 - ACADEMY LOGO & ENHANCEMENTS
-- Descrição: Adiciona campo de logo e garante atualizações de estrutura
-- ============================================================================

-- 1. Adicionar coluna logo_url
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Atualizar função update_academy_self para incluir logo_url
-- Drop old version to avoid signature conflicts or keeping obsolete versions
DROP FUNCTION IF EXISTS update_academy_self(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS update_academy_self(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB, TEXT);

CREATE OR REPLACE FUNCTION update_academy_self(
    p_academy_id UUID,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_photos JSONB DEFAULT NULL,
    p_rules JSONB DEFAULT NULL,
    p_amenities JSONB DEFAULT NULL,
    p_opening_hours JSONB DEFAULT NULL,
    p_contacts JSONB DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL
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
    
    -- Atualizar campos
    UPDATE academies SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        address = COALESCE(p_address, address),
        photos = COALESCE(p_photos, photos),
        rules = COALESCE(p_rules, rules),
        amenities = COALESCE(p_amenities, amenities),
        opening_hours = COALESCE(p_opening_hours, opening_hours),
        contacts = COALESCE(p_contacts, contacts),
        logo_url = COALESCE(p_logo_url, logo_url),
        updated_at = NOW()
    WHERE id = p_academy_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar função get_my_academy para retornar logo_url
-- DROP NECESSÁRIO porque o tipo de retorno mudou
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
        a.modality,
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

-- Notificação
DO $$
BEGIN
    RAISE NOTICE '✅ Migração MVP 0.5.10 concluída: Logo URL adicionado.';
END $$;
