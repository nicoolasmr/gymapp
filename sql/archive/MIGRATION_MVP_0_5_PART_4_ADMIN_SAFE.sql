-- ============================================================================
-- MIGRATION: MVP 0.5 - PART 4: PAINEL ADMIN GLOBAL (VERSÃO SAFE)
-- Descrição: Sistema de roles e permissões para administração
-- Autor: Antigravity (Senior Developer)
-- Data: 2025-11-24
-- Versão: 0.5.4 (Safe - não dá erro se já existir)
-- Email configurado: nicoolascf5@gmail.com
-- ============================================================================

-- ============================================================================
-- STEP 1: ADICIONAR CAMPO DE ROLE EM USERS
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' 
            CHECK (role IN ('user', 'partner', 'admin', 'super_admin'));
        
        CREATE INDEX idx_users_role ON users(role);
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CRIAR TABELA DE LOGS DE AÇÕES ADMIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    action_type TEXT NOT NULL CHECK (action_type IN (
        'create_academy', 'update_academy', 'delete_academy',
        'create_user', 'update_user', 'delete_user', 'change_user_role',
        'create_plan', 'update_plan', 'delete_plan',
        'update_pricing', 'export_data', 'view_sensitive_data'
    )),
    
    target_type TEXT,
    target_id UUID,
    changes JSONB,
    
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_logs_admin') THEN
        CREATE INDEX idx_admin_logs_admin ON admin_action_logs(admin_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_logs_action') THEN
        CREATE INDEX idx_admin_logs_action ON admin_action_logs(action_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_logs_target') THEN
        CREATE INDEX idx_admin_logs_target ON admin_action_logs(target_type, target_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_logs_date') THEN
        CREATE INDEX idx_admin_logs_date ON admin_action_logs(created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- STEP 3: FUNÇÃO - VERIFICAR SE É ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    SELECT role INTO v_role
    FROM users
    WHERE id = v_user_id;
    
    RETURN v_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: FUNÇÃO - REGISTRAR AÇÃO ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION log_admin_action(
    p_action_type TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação';
    END IF;
    
    INSERT INTO admin_action_logs (
        admin_id,
        action_type,
        target_type,
        target_id,
        changes
    ) VALUES (
        auth.uid(),
        p_action_type,
        p_target_type,
        p_target_id,
        p_changes
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: VIEW - DASHBOARD FINANCEIRO GLOBAL
-- ============================================================================

CREATE OR REPLACE VIEW admin_financial_overview AS
SELECT 
    mp.modality_type,
    COUNT(DISTINCT m.id) as total_memberships,
    COUNT(DISTINCT m.user_id) as total_users,
    SUM(mp.monthly_price) as monthly_revenue,
    
    COUNT(DISTINCT c.id) as total_checkins,
    SUM(c.repasse_value) as total_repasse,
    
    SUM(mp.monthly_price) - COALESCE(SUM(c.repasse_value), 0) as platform_margin,
    
    DATE_TRUNC('month', CURRENT_DATE) as period
FROM modality_plans mp
LEFT JOIN memberships m ON m.modality_plan_id = mp.id AND m.status = 'active'
LEFT JOIN checkins c ON c.user_id = m.user_id 
    AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE mp.is_active = true
GROUP BY mp.modality_type;

-- ============================================================================
-- STEP 6: VIEW - ESTATÍSTICAS GERAIS
-- ============================================================================

CREATE OR REPLACE VIEW admin_general_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'partner') as total_partners,
    (SELECT COUNT(*) FROM academies WHERE active = true) as total_academies,
    (SELECT COUNT(*) FROM memberships WHERE status = 'active') as active_memberships,
    (SELECT COUNT(*) FROM checkins WHERE DATE(created_at) = CURRENT_DATE) as checkins_today,
    (SELECT COUNT(*) FROM checkins WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as checkins_this_month,
    (SELECT COUNT(*) FROM competitions WHERE status = 'active') as active_competitions,
    (SELECT COUNT(*) FROM referrals WHERE status = 'converted') as converted_referrals;

-- ============================================================================
-- STEP 7: FUNÇÃO - EXPORTAR DADOS FINANCEIROS
-- ============================================================================

CREATE OR REPLACE FUNCTION export_financial_data(
    p_start_date DATE,
    p_end_date DATE,
    p_modality_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    academy_name TEXT,
    modality TEXT,
    total_checkins BIGINT,
    total_repasse NUMERIC,
    period TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.name as academy_name,
        a.modality::TEXT as modality,
        COUNT(c.id) as total_checkins,
        SUM(c.repasse_value) as total_repasse,
        TO_CHAR(DATE_TRUNC('month', c.created_at), 'YYYY-MM') as period
    FROM academies a
    LEFT JOIN checkins c ON c.academy_id = a.id
        AND c.created_at >= p_start_date
        AND c.created_at <= p_end_date
    WHERE (p_modality_type IS NULL OR a.modality = p_modality_type::academy_modality)
    GROUP BY a.id, a.name, a.modality, DATE_TRUNC('month', c.created_at)
    ORDER BY period DESC, total_repasse DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: RLS POLICIES
-- ============================================================================

ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem
DROP POLICY IF EXISTS "Apenas admins veem logs" ON admin_action_logs;
DROP POLICY IF EXISTS "Sistema cria logs" ON admin_action_logs;

-- Recriar policies
CREATE POLICY "Apenas admins veem logs"
ON admin_action_logs FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Sistema cria logs"
ON admin_action_logs FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid() AND is_admin());

-- ============================================================================
-- STEP 9: CRIAR SUPER ADMIN (VOCÊ)
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Buscar usuário pelo email: nicoolascf5@gmail.com
    SELECT id INTO v_user_id
    FROM users
    WHERE email = 'nicoolascf5@gmail.com'
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        UPDATE users
        SET role = 'super_admin'
        WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Usuário % promovido a super_admin', v_user_id;
    ELSE
        RAISE NOTICE '⚠️  Usuário com email nicoolascf5@gmail.com não encontrado.';
        RAISE NOTICE '💡 Crie uma conta com este email primeiro!';
    END IF;
END $$;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
    v_admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_admin_count 
    FROM users 
    WHERE role IN ('admin', 'super_admin');
    
    RAISE NOTICE '✅ Migração PART 4 concluída com sucesso!';
    RAISE NOTICE '📊 Tabela: admin_action_logs';
    RAISE NOTICE '⚡ Funções: 3';
    RAISE NOTICE '👁️ Views: 2 (admin_financial_overview, admin_general_stats)';
    RAISE NOTICE '👤 Total de administradores: %', v_admin_count;
END $$;
