-- ============================================================================
-- MIGRATION: MVP 0.5.7 - ADMIN INTELLIGENCE METRICS
-- Descrição: Views e funções para dashboard avançado com drill-down
-- ============================================================================

-- 1. VIEW: Métricas por Academia (Detalhado)
CREATE OR REPLACE VIEW admin_academy_metrics AS
SELECT 
    a.id,
    a.name,
    a.modality,
    a.address,
    a.active,
    a.created_at,
    
    -- Contagem de alunos ativos
    (SELECT COUNT(DISTINCT m.user_id) 
     FROM memberships m 
     WHERE m.status = 'active') as total_active_members,
    
    -- Check-ins do mês atual
    (SELECT COUNT(*) 
     FROM checkins c 
     WHERE c.academy_id = a.id 
     AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as checkins_this_month,
    
    -- Receita estimada (check-ins × repasse médio)
    (SELECT COALESCE(SUM(c.repasse_value), 0) 
     FROM checkins c 
     WHERE c.academy_id = a.id 
     AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as total_repasse_month,
    
    -- Margem da plataforma (assumindo 20% sobre o repasse como exemplo)
    (SELECT COALESCE(SUM(c.repasse_value), 0) * 0.25
     FROM checkins c 
     WHERE c.academy_id = a.id 
     AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as platform_margin_month,
    
    -- Repasse customizado (se houver)
    a.custom_repasse_value
    
FROM academies a
ORDER BY a.created_at DESC;

-- 2. VIEW: Agregação por Modalidade
CREATE OR REPLACE VIEW admin_modality_summary AS
SELECT 
    modality,
    COUNT(*) as total_academies,
    COUNT(*) FILTER (WHERE active = true) as active_academies,
    
    (SELECT COUNT(DISTINCT m.user_id) 
     FROM memberships m 
     JOIN academies a2 ON true
     WHERE a2.modality = academies.modality 
     AND m.status = 'active') as total_members,
    
    (SELECT COALESCE(SUM(c.repasse_value), 0)
     FROM checkins c
     JOIN academies a2 ON c.academy_id = a2.id
     WHERE a2.modality = academies.modality
     AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as total_revenue_month
     
FROM academies
GROUP BY modality;

-- 3. FUNCTION: Criar Nova Academia (Admin)
CREATE OR REPLACE FUNCTION create_academy_admin(
    p_name TEXT,
    p_address TEXT,
    p_modality TEXT,
    p_owner_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_academy_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Verificar permissão
    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM users WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Apenas administradores podem criar academias.';
    END IF;
    
    -- Criar academia
    INSERT INTO academies (name, address, modality, owner_id, active)
    VALUES (p_name, p_address, p_modality, p_owner_id, false) -- Inativa por padrão
    RETURNING id INTO v_academy_id;
    
    -- Log
    PERFORM log_admin_action(
        'create_academy',
        'academy',
        v_academy_id,
        jsonb_build_object('name', p_name, 'modality', p_modality)
    );
    
    RETURN v_academy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notificação
DO $$
BEGIN
    RAISE NOTICE '✅ Migração MVP 0.5.7 concluída: Views de métricas criadas.';
END $$;
