-- ============================================================================
-- MIGRATION: MVP 0.5 - PART 4: PAINEL ADMIN GLOBAL
-- Descrição: Sistema de roles e permissões para administração
-- Autor: Antigravity (Senior Developer)
-- Data: 2025-11-24
-- Versão: MVP 0.5.4
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
        
        COMMENT ON COLUMN users.role IS 'Papel do usuário: user, partner, admin, super_admin';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CRIAR TABELA DE LOGS DE AÇÕES ADMIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Quem fez a ação
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Ação realizada
    action_type TEXT NOT NULL CHECK (action_type IN (
        'create_academy', 'update_academy', 'delete_academy',
        'create_user', 'update_user', 'delete_user', 'change_user_role',
        'create_plan', 'update_plan', 'delete_plan',
        'update_pricing', 'export_data', 'view_sensitive_data'
    )),
    
    -- Detalhes
    target_type TEXT, -- 'academy', 'user', 'plan', etc
    target_id UUID,
    changes JSONB, -- Antes e depois
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_admin_logs_admin ON admin_action_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_action_logs(action_type);
CREATE INDEX idx_admin_logs_target ON admin_action_logs(target_type, target_id);
CREATE INDEX idx_admin_logs_date ON admin_action_logs(created_at DESC);

COMMENT ON TABLE admin_action_logs IS 'Log de todas as ações administrativas para auditoria';

-- ============================================================================
-- STEP 3: FUNÇÃO - VERIFICAR SE USUÁRIO É ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    -- Se não passou user_id, usa o atual
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Buscar role
    SELECT role INTO v_role
    FROM users
    WHERE id = v_user_id;
    
    RETURN v_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin IS 'Verifica se usuário tem permissão de admin';

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
    -- Verificar se é admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação';
    END IF;
    
    -- Criar log
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

COMMENT ON FUNCTION log_admin_action IS 'Registra ação administrativa para auditoria';

-- ============================================================================
-- STEP 5: VIEW - DASHBOARD FINANCEIRO GLOBAL
-- ============================================================================

CREATE OR REPLACE VIEW admin_financial_overview AS
SELECT 
    -- Faturamento por modalidade
    mp.modality_type,
    COUNT(DISTINCT m.id) as total_memberships,
    COUNT(DISTINCT m.user_id) as total_users,
    SUM(mp.monthly_price) as monthly_revenue,
    
    -- Repasses
    COUNT(DISTINCT c.id) as total_checkins,
    SUM(c.repasse_value) as total_repasse,
    
    -- Margem
    SUM(mp.monthly_price) - COALESCE(SUM(c.repasse_value), 0) as platform_margin,
    
    -- Período
    DATE_TRUNC('month', CURRENT_DATE) as period
FROM modality_plans mp
LEFT JOIN memberships m ON m.modality_plan_id = mp.id AND m.status = 'active'
LEFT JOIN checkins c ON c.user_id = m.user_id 
    AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE mp.is_active = true
GROUP BY mp.modality_type;

COMMENT ON VIEW admin_financial_overview IS 'Visão consolidada de finanças por modalidade';

-- ============================================================================
-- STEP 6: VIEW - ESTATÍSTICAS GERAIS
-- ============================================================================

CREATE OR REPLACE VIEW admin_general_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'partner') as total_partners,
    (SELECT COUNT(*) FROM academies WHERE is_active = true) as total_academies,
    (SELECT COUNT(*) FROM memberships WHERE status = 'active') as active_memberships,
    (SELECT COUNT(*) FROM checkins WHERE DATE(created_at) = CURRENT_DATE) as checkins_today,
    (SELECT COUNT(*) FROM checkins WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as checkins_this_month,
    (SELECT COUNT(*) FROM competitions WHERE status = 'active') as active_competitions,
    (SELECT COUNT(*) FROM referrals WHERE status = 'converted') as converted_referrals;

COMMENT ON VIEW admin_general_stats IS 'Estatísticas gerais da plataforma';

-- ============================================================================
-- STEP 7: FUNÇÃO - EXPORTAR DADOS FINANCEIROS (CSV)
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

COMMENT ON FUNCTION export_financial_data IS 'Exporta dados financeiros para CSV';

-- ============================================================================
-- STEP 8: RLS POLICIES PARA ADMIN
-- ============================================================================

-- Admin Action Logs - apenas admins podem ver
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins veem logs"
ON admin_action_logs FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Sistema cria logs"
ON admin_action_logs FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid() AND is_admin());

-- Permitir admins verem todos os dados (bypass RLS)
-- Nota: Isso será implementado no código do painel

-- ============================================================================
-- STEP 9: CRIAR PRIMEIRO SUPER ADMIN (VOCÊ)
-- ============================================================================

-- Atualizar seu usuário para super_admin
-- Email configurado: nicoolascf5@gmail.com

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Buscar seu usuário pelo email
    SELECT id INTO v_user_id
    FROM users
    WHERE email = 'nicoolascf5@gmail.com'
    LIMIT 1;
    
    -- Se encontrou, atualizar para super_admin
    IF v_user_id IS NOT NULL THEN
        UPDATE users
        SET role = 'super_admin'
        WHERE id = v_user_id;
        
        RAISE NOTICE 'Usuário % promovido a super_admin', v_user_id;
    ELSE
        RAISE NOTICE 'Usuário não encontrado. Atualize o email no script.';
    END IF;
END $$;

-- ============================================================================
-- STEP 10: SEED - DADOS DE EXEMPLO
-- ============================================================================

-- Criar alguns usuários de teste com diferentes roles (comentado)
/*
INSERT INTO users (email, full_name, role) VALUES
('admin@evolve.com', 'Admin Teste', 'admin'),
('partner@evolve.com', 'Parceiro Teste', 'partner'),
('user@evolve.com', 'Usuário Teste', 'user');
*/

-- ============================================================================
-- ROLLBACK SCRIPT (COMENTADO - USAR APENAS SE NECESSÁRIO)
-- ============================================================================

/*
-- Para reverter esta migração:

DROP FUNCTION IF EXISTS export_financial_data(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS log_admin_action(TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS is_admin(UUID);

DROP VIEW IF EXISTS admin_general_stats;
DROP VIEW IF EXISTS admin_financial_overview;

DROP POLICY IF EXISTS "Apenas admins veem logs" ON admin_action_logs;
DROP POLICY IF EXISTS "Sistema cria logs" ON admin_action_logs;

DROP TABLE IF EXISTS admin_action_logs CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS role;
*/

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

-- Verificação final
DO $$
DECLARE
    v_admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_admin_count 
    FROM users 
    WHERE role IN ('admin', 'super_admin');
    
    RAISE NOTICE 'Migração de Admin concluída com sucesso!';
    RAISE NOTICE 'Tabela criada: admin_action_logs';
    RAISE NOTICE 'Funções criadas: 3';
    RAISE NOTICE 'Views criadas: 2';
    RAISE NOTICE 'Total de administradores: %', v_admin_count;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: Atualize o email no STEP 9 para criar seu super_admin!';
END $$;
