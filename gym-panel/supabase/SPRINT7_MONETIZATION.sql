-- ============================================
-- 🚀 SPRINT 7: MONETIZAÇÃO AVANÇADA + MARKETPLACE
-- ============================================
-- Copie e cole este arquivo COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. TABELA: premium_features (Recursos Premium)
-- ============================================

CREATE TABLE IF NOT EXISTS premium_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT, -- 'user' ou 'academy'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir features padrão
INSERT INTO premium_features (feature_key, name, description, icon, category) VALUES
('unlimited_checkins', 'Check-ins Ilimitados', 'Faça check-in em quantas academias quiser', '🔥', 'user'),
('exclusive_badges', 'Badges Exclusivas', 'Conquiste badges premium únicas', '💎', 'user'),
('advanced_stats', 'Estatísticas Avançadas', 'Veja análises detalhadas do seu progresso', '📊', 'user'),
('global_ranking', 'Ranking Global', 'Participe do ranking mundial', '🏆', 'user'),
('weekly_missions', 'Missões Semanais', 'Desafios com recompensas reais', '🎯', 'user'),
('special_invites', 'Convites Especiais', 'Acesso a eventos exclusivos', '🎫', 'user'),
('marketplace_boost', 'Destaque no Marketplace', 'Apareça no topo da lista', '⭐', 'academy'),
('premium_insights', 'Insights Premium', 'Previsões e análises avançadas', '🔮', 'academy'),
('competitor_dashboard', 'Dashboard de Concorrência', 'Veja métricas dos concorrentes', '📈', 'academy')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================
-- 2. TABELA: premium_prices (Preços Premium)
-- ============================================

CREATE TABLE IF NOT EXISTS premium_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type TEXT NOT NULL, -- 'user_monthly', 'user_yearly', 'academy_monthly', etc
    price_cents INT NOT NULL,
    currency TEXT DEFAULT 'BRL',
    interval TEXT NOT NULL, -- 'month', 'year', 'week'
    stripe_price_id TEXT,
    features JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir preços padrão
INSERT INTO premium_prices (plan_type, price_cents, interval, features) VALUES
('user_monthly', 1290, 'month', '["unlimited_checkins", "exclusive_badges", "advanced_stats", "global_ranking", "weekly_missions", "special_invites"]'::JSONB),
('user_yearly', 12900, 'year', '["unlimited_checkins", "exclusive_badges", "advanced_stats", "global_ranking", "weekly_missions", "special_invites"]'::JSONB),
('academy_monthly', 9900, 'month', '["marketplace_boost", "premium_insights", "competitor_dashboard"]'::JSONB)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. TABELA: user_subscriptions (Assinaturas de Usuários)
-- ============================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'canceled', 'expired', 'trial'
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- ============================================
-- 4. TABELA: marketplace_benefits (Benefícios do Marketplace)
-- ============================================

CREATE TABLE IF NOT EXISTS marketplace_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'supplements', 'clothing', 'food', 'wellness', 'recovery', 'personal_care'
    image_url TEXT,
    coupon_code TEXT,
    discount_value TEXT, -- '10%', 'R$ 50', etc
    quantity_limit INT,
    quantity_used INT DEFAULT 0,
    is_premium_only BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_benefits_category ON marketplace_benefits(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_benefits_active ON marketplace_benefits(is_active);

-- ============================================
-- 5. TABELA: academy_boosts (Boosts de Academias)
-- ============================================

CREATE TABLE IF NOT EXISTS academy_boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE NOT NULL,
    boost_type TEXT NOT NULL, -- 'local', 'regional', 'national', 'modality'
    price_cents INT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'expired', 'canceled'
    stripe_payment_id TEXT,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    target_location TEXT, -- cidade, estado, ou null para nacional
    target_modality TEXT, -- modalidade específica ou null
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_boosts_academy_id ON academy_boosts(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_boosts_status ON academy_boosts(status);
CREATE INDEX IF NOT EXISTS idx_academy_boosts_end_date ON academy_boosts(end_date);

-- ============================================
-- 6. TABELA: user_missions (Missões Semanais)
-- ============================================

CREATE TABLE IF NOT EXISTS user_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mission_type TEXT NOT NULL, -- 'train_3x', 'different_academies', 'beat_streak', 'new_badge'
    title TEXT NOT NULL,
    description TEXT,
    target_value INT, -- valor alvo (ex: 3 para "treinar 3x")
    current_value INT DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'claimed'
    reward_type TEXT, -- 'points', 'badge', 'coupon', 'premium_trial'
    reward_value JSONB,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(status);
CREATE INDEX IF NOT EXISTS idx_user_missions_expires_at ON user_missions(expires_at);

-- ============================================
-- 7. TABELA: user_premium_points (Pontos Premium)
-- ============================================

CREATE TABLE IF NOT EXISTS user_premium_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    total_points INT DEFAULT 0,
    lifetime_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. FUNÇÃO: Verificar se usuário é premium
-- ============================================

CREATE OR REPLACE FUNCTION is_user_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_premium BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND current_period_end > NOW()
    ) INTO v_is_premium;
    
    RETURN v_is_premium;
END;
$$;

-- ============================================
-- 9. FUNÇÃO: Obter academias com boost ativo
-- ============================================

CREATE OR REPLACE FUNCTION get_boosted_academies(
    p_location TEXT DEFAULT NULL,
    p_modality TEXT DEFAULT NULL
)
RETURNS TABLE (
    academy_id UUID,
    academy_name TEXT,
    boost_type TEXT,
    end_date TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        ab.boost_type,
        ab.end_date
    FROM academy_boosts ab
    JOIN academies a ON a.id = ab.academy_id
    WHERE ab.status = 'active'
      AND ab.end_date > NOW()
      AND (p_location IS NULL OR ab.target_location = p_location OR ab.boost_type = 'national')
      AND (p_modality IS NULL OR ab.target_modality = p_modality OR ab.target_modality IS NULL)
    ORDER BY 
        CASE ab.boost_type
            WHEN 'national' THEN 1
            WHEN 'regional' THEN 2
            WHEN 'local' THEN 3
            WHEN 'modality' THEN 4
        END,
        ab.created_at DESC;
END;
$$;

-- ============================================
-- 10. FUNÇÃO: Gerar missões semanais
-- ============================================

CREATE OR REPLACE FUNCTION generate_weekly_missions(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_end TIMESTAMP := NOW() + INTERVAL '7 days';
BEGIN
    -- Limpar missões expiradas
    UPDATE user_missions 
    SET status = 'expired' 
    WHERE user_id = p_user_id 
      AND status = 'pending' 
      AND expires_at < NOW();
    
    -- Criar novas missões se não existirem para esta semana
    IF NOT EXISTS (
        SELECT 1 FROM user_missions 
        WHERE user_id = p_user_id 
          AND status = 'pending' 
          AND expires_at > NOW()
    ) THEN
        -- Missão 1: Treinar 3x
        INSERT INTO user_missions (user_id, mission_type, title, description, target_value, reward_type, reward_value, expires_at)
        VALUES (
            p_user_id,
            'train_3x',
            'Treinar 3x essa semana',
            'Faça check-in em 3 dias diferentes',
            3,
            'points',
            '{"points": 100}'::JSONB,
            v_week_end
        );
        
        -- Missão 2: Academias diferentes
        INSERT INTO user_missions (user_id, mission_type, title, description, target_value, reward_type, reward_value, expires_at)
        VALUES (
            p_user_id,
            'different_academies',
            'Explore novas academias',
            'Faça check-in em 2 academias diferentes',
            2,
            'badge',
            '{"badge_id": "explorer"}'::JSONB,
            v_week_end
        );
        
        -- Missão 3: Manter streak
        INSERT INTO user_missions (user_id, mission_type, title, description, target_value, reward_type, reward_value, expires_at)
        VALUES (
            p_user_id,
            'beat_streak',
            'Bata seu recorde de streak',
            'Mantenha uma sequência de 5 dias',
            5,
            'premium_trial',
            '{"days": 7}'::JSONB,
            v_week_end
        );
    END IF;
END;
$$;

-- ============================================
-- 11. CONCEDER PERMISSÕES
-- ============================================

GRANT ALL ON premium_features TO authenticated;
GRANT ALL ON premium_prices TO authenticated;
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON marketplace_benefits TO authenticated;
GRANT ALL ON academy_boosts TO authenticated;
GRANT ALL ON user_missions TO authenticated;
GRANT ALL ON user_premium_points TO authenticated;

GRANT EXECUTE ON FUNCTION is_user_premium(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_boosted_academies(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_weekly_missions(UUID) TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Execute este SQL no Supabase para criar toda a estrutura de monetização
