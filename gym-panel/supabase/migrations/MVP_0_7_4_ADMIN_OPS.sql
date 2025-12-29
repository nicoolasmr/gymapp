-- ==============================================================================
-- 🚀 MVP 0.7.4: ADMIN OPS COCKPIT
-- ==============================================================================

-- 1. Estender Tabela de Usuários (Controle Admin)
DO $$ 
BEGIN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);
END $$;

-- 2. Estender Tabela de Academias (Suspensão)
DO $$ 
BEGIN
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);
END $$;

-- 3. Tabela de Auditoria de Ações Admin
CREATE TABLE IF NOT EXISTS admin_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- 'block_user', 'suspend_academy', 'create_user', 'approve_payout', etc
    target_type TEXT, -- 'user', 'academy', 'payout_run', etc
    target_id UUID,
    details JSONB, -- Extra context (ex: reason, old_value, new_value)
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions_log(target_type, target_id);

-- 4. View: Platform Metrics (Dashboard Global)
CREATE OR REPLACE VIEW view_platform_metrics AS
SELECT
    -- Users
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
    (SELECT COUNT(*) FROM users WHERE is_blocked = true) as blocked_users,
    
    -- Academies
    (SELECT COUNT(*) FROM academies) as total_academies,
    (SELECT COUNT(*) FROM academies WHERE status = 'active') as active_academies,
    (SELECT COUNT(*) FROM academies WHERE is_suspended = true) as suspended_academies,
    
    -- Memberships (Revenue) - Simplified without plan_type
    (SELECT COUNT(*) FROM memberships WHERE status = 'active') as active_memberships,
    0 as solo_plans, -- Placeholder (requires plan_type column)
    0 as family_plans, -- Placeholder (requires plan_type column)
    
    -- Checkins
    (SELECT COUNT(*) FROM checkins WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as checkins_30d,
    (SELECT COUNT(*) FROM checkins WHERE status = 'validated') as validated_checkins_total,
    
    -- Reviews
    (SELECT COUNT(*) FROM academy_reviews WHERE status = 'published') as published_reviews,
    (SELECT COUNT(*) FROM academy_reviews WHERE status = 'pending') as pending_reviews,
    
    -- Ads
    (SELECT COUNT(*) FROM ads_campaigns WHERE status = 'active') as active_ads,
    (SELECT COALESCE(SUM(total_amount_cents), 0) FROM payout_runs WHERE status = 'paid') as total_payouts_cents;


-- 5. RPC: Block/Unblock User
CREATE OR REPLACE FUNCTION admin_block_user(
    p_user_id UUID,
    p_block BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
BEGIN
    -- Verificar se quem está chamando é admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_admin_id AND role = 'superadmin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    -- Atualizar usuário
    UPDATE users 
    SET 
        is_blocked = p_block,
        blocked_reason = CASE WHEN p_block THEN p_reason ELSE NULL END,
        blocked_at = CASE WHEN p_block THEN NOW() ELSE NULL END,
        blocked_by = CASE WHEN p_block THEN v_admin_id ELSE NULL END
    WHERE id = p_user_id;
    
    -- Log da ação
    INSERT INTO admin_actions_log (admin_id, action_type, target_type, target_id, details)
    VALUES (
        v_admin_id,
        CASE WHEN p_block THEN 'block_user' ELSE 'unblock_user' END,
        'user',
        p_user_id,
        jsonb_build_object('reason', p_reason)
    );
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. RPC: Suspend/Unsuspend Academy
CREATE OR REPLACE FUNCTION admin_suspend_academy(
    p_academy_id UUID,
    p_suspend BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_admin_id AND role = 'superadmin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    UPDATE academies 
    SET 
        is_suspended = p_suspend,
        suspended_reason = CASE WHEN p_suspend THEN p_reason ELSE NULL END,
        suspended_at = CASE WHEN p_suspend THEN NOW() ELSE NULL END,
        suspended_by = CASE WHEN p_suspend THEN v_admin_id ELSE NULL END
    WHERE id = p_academy_id;
    
    INSERT INTO admin_actions_log (admin_id, action_type, target_type, target_id, details)
    VALUES (
        v_admin_id,
        CASE WHEN p_suspend THEN 'suspend_academy' ELSE 'unsuspend_academy' END,
        'academy',
        p_academy_id,
        jsonb_build_object('reason', p_reason)
    );
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. RPC: Detect Suspicious Checkins (Anti-Fraud)
CREATE OR REPLACE FUNCTION detect_suspicious_checkins()
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    checkin_count INTEGER,
    distinct_academies INTEGER,
    last_checkin TIMESTAMPTZ,
    suspicion_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Usuários com muitos check-ins em academias diferentes no mesmo dia (possível fraude)
    SELECT 
        u.id,
        u.email,
        COUNT(c.id)::INTEGER as checkin_count,
        COUNT(DISTINCT c.academy_id)::INTEGER as distinct_academies,
        MAX(c.created_at) as last_checkin,
        'Multiple academies same day' as suspicion_reason
    FROM users u
    JOIN checkins c ON u.id = c.user_id
    WHERE c.created_at::date = CURRENT_DATE
    GROUP BY u.id, u.email
    HAVING COUNT(DISTINCT c.academy_id) > 3 -- Mais de 3 academias no mesmo dia é suspeito
    
    UNION ALL
    
    -- Usuários com check-ins muito frequentes (bot?)
    SELECT 
        u.id,
        u.email,
        COUNT(c.id)::INTEGER,
        COUNT(DISTINCT c.academy_id)::INTEGER,
        MAX(c.created_at),
        'High frequency checkins' as suspicion_reason
    FROM users u
    JOIN checkins c ON u.id = c.user_id
    WHERE c.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY u.id, u.email
    HAVING COUNT(c.id) > 20; -- Mais de 20 check-ins em 7 dias
END;
$$;

-- 8. Policies (RLS)
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins veem o log
CREATE POLICY "Admins view audit log" ON admin_actions_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
);

-- Grant privileges
GRANT ALL ON admin_actions_log TO service_role;
GRANT SELECT ON view_platform_metrics TO authenticated;
