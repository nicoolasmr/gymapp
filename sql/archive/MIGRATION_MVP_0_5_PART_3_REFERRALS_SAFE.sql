-- ============================================================================
-- MIGRATION: MVP 0.5 - PART 3: SISTEMA DE CONVITES (VERSÃO SAFE)
-- Descrição: Crescimento orgânico via indicação com 10% de desconto
-- Autor: Antigravity (Senior Developer)
-- Data: 2025-11-24
-- Versão: 0.5.3 (Safe - não dá erro se já existir)
-- ============================================================================

-- ============================================================================
-- STEP 1: ADICIONAR CAMPOS EM USERS
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'referral_code'
    ) THEN
        ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
        ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES auth.users(id);
        
        CREATE INDEX idx_users_referral_code ON users(referral_code);
        CREATE INDEX idx_users_referred_by ON users(referred_by);
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CRIAR TABELA DE CONVITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    referral_code TEXT NOT NULL,
    
    referred_email TEXT,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired', 'cancelled')),
    
    converted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (referred_id IS NOT NULL OR referred_email IS NOT NULL)
);

-- Índices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_referrer') THEN
        CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_referred') THEN
        CREATE INDEX idx_referrals_referred ON referrals(referred_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_code') THEN
        CREATE INDEX idx_referrals_code ON referrals(referral_code);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_status') THEN
        CREATE INDEX idx_referrals_status ON referrals(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referrals_email') THEN
        CREATE INDEX idx_referrals_email ON referrals(referred_email);
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CRIAR TABELA DE RECOMPENSAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    discount_percentage DECIMAL(5,2) DEFAULT 10.00 CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    discount_amount DECIMAL(10,2),
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
    applied_to_membership_id UUID REFERENCES memberships(id),
    applied_at TIMESTAMPTZ,
    
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
    
    stripe_coupon_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rewards_referral') THEN
        CREATE INDEX idx_rewards_referral ON referral_rewards(referral_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rewards_user') THEN
        CREATE INDEX idx_rewards_user ON referral_rewards(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rewards_status') THEN
        CREATE INDEX idx_rewards_status ON referral_rewards(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rewards_pending') THEN
        CREATE INDEX idx_rewards_pending ON referral_rewards(user_id, status) WHERE status = 'pending';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: FUNÇÃO - GERAR CÓDIGO ÚNICO
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_attempts INTEGER := 0;
BEGIN
    LOOP
        v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
        
        SELECT EXISTS(
            SELECT 1 FROM users WHERE referral_code = v_code
        ) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
        
        v_attempts := v_attempts + 1;
        IF v_attempts > 100 THEN
            RAISE EXCEPTION 'Não foi possível gerar código único após 100 tentativas';
        END IF;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: FUNÇÃO - CRIAR CONVITE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_referral(
    p_referrer_id UUID,
    p_referred_email TEXT DEFAULT NULL,
    p_referred_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_referral_id UUID;
    v_referral_code TEXT;
BEGIN
    SELECT referral_code INTO v_referral_code
    FROM users
    WHERE id = p_referrer_id;
    
    IF v_referral_code IS NULL THEN
        v_referral_code := generate_referral_code();
        UPDATE users SET referral_code = v_referral_code WHERE id = p_referrer_id;
    END IF;
    
    INSERT INTO referrals (
        referrer_id,
        referred_id,
        referred_email,
        referral_code,
        status
    ) VALUES (
        p_referrer_id,
        p_referred_id,
        p_referred_email,
        v_referral_code,
        CASE WHEN p_referred_id IS NOT NULL THEN 'pending' ELSE 'pending' END
    )
    RETURNING id INTO v_referral_id;
    
    RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: FUNÇÃO - CONVERTER CONVITE
-- ============================================================================

CREATE OR REPLACE FUNCTION convert_referral(
    p_referral_code TEXT,
    p_referred_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_referral RECORD;
    v_reward_id UUID;
BEGIN
    SELECT * INTO v_referral
    FROM referrals
    WHERE referral_code = p_referral_code
      AND (referred_id = p_referred_user_id OR referred_id IS NULL)
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_referral IS NULL THEN
        RAISE EXCEPTION 'Convite não encontrado ou expirado';
    END IF;
    
    UPDATE referrals
    SET 
        status = 'converted',
        referred_id = p_referred_user_id,
        converted_at = NOW()
    WHERE id = v_referral.id;
    
    UPDATE users
    SET referred_by = v_referral.referrer_id
    WHERE id = p_referred_user_id;
    
    INSERT INTO referral_rewards (
        referral_id,
        user_id,
        discount_percentage,
        status
    ) VALUES (
        v_referral.id,
        v_referral.referrer_id,
        10.00,
        'pending'
    )
    RETURNING id INTO v_reward_id;
    
    RETURN v_reward_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: FUNÇÃO - APLICAR DESCONTO
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_referral_discount(
    p_user_id UUID,
    p_membership_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_reward RECORD;
    v_membership RECORD;
    v_discount_amount DECIMAL;
    v_final_price DECIMAL;
BEGIN
    SELECT * INTO v_reward
    FROM referral_rewards
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_reward IS NULL THEN
        RETURN json_build_object(
            'has_discount', false,
            'message', 'Nenhum desconto disponível'
        );
    END IF;
    
    SELECT m.*, mp.monthly_price
    INTO v_membership
    FROM memberships m
    JOIN modality_plans mp ON mp.id = m.modality_plan_id
    WHERE m.id = p_membership_id;
    
    v_discount_amount := ROUND(v_membership.monthly_price * (v_reward.discount_percentage / 100), 2);
    v_final_price := v_membership.monthly_price - v_discount_amount;
    
    UPDATE referral_rewards
    SET 
        status = 'applied',
        applied_to_membership_id = p_membership_id,
        applied_at = NOW(),
        discount_amount = v_discount_amount
    WHERE id = v_reward.id;
    
    RETURN json_build_object(
        'has_discount', true,
        'discount_percentage', v_reward.discount_percentage,
        'discount_amount', v_discount_amount,
        'original_price', v_membership.monthly_price,
        'final_price', v_final_price,
        'reward_id', v_reward.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: TRIGGER - GERAR CÓDIGO AO CRIAR USUÁRIO
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_referral_code ON users;
CREATE TRIGGER trigger_user_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_referral_code();

-- ============================================================================
-- STEP 9: GERAR CÓDIGOS PARA USUÁRIOS EXISTENTES
-- ============================================================================

UPDATE users
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- ============================================================================
-- STEP 10: VIEW - ESTATÍSTICAS
-- ============================================================================

CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.referral_code,
    COUNT(DISTINCT r.id) as total_invites,
    COUNT(DISTINCT CASE WHEN r.status = 'converted' THEN r.id END) as converted_invites,
    COUNT(DISTINCT rr.id) as total_rewards,
    COUNT(DISTINCT CASE WHEN rr.status = 'pending' THEN rr.id END) as pending_rewards,
    COUNT(DISTINCT CASE WHEN rr.status = 'applied' THEN rr.id END) as applied_rewards,
    COALESCE(SUM(CASE WHEN rr.status = 'applied' THEN rr.discount_amount ELSE 0 END), 0) as total_saved
FROM users u
LEFT JOIN referrals r ON r.referrer_id = u.id
LEFT JOIN referral_rewards rr ON rr.user_id = u.id
GROUP BY u.id, u.email, u.referral_code;

-- ============================================================================
-- STEP 11: RLS POLICIES
-- ============================================================================

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem
DROP POLICY IF EXISTS "Usuários veem próprios convites" ON referrals;
DROP POLICY IF EXISTS "Usuários podem criar convites" ON referrals;
DROP POLICY IF EXISTS "Sistema atualiza status de convites" ON referrals;
DROP POLICY IF EXISTS "Usuários veem próprias recompensas" ON referral_rewards;
DROP POLICY IF EXISTS "Sistema gerencia recompensas" ON referral_rewards;

-- Recriar policies
CREATE POLICY "Usuários veem próprios convites"
ON referrals FOR SELECT
TO authenticated
USING (
    referrer_id = auth.uid() 
    OR referred_id = auth.uid()
);

CREATE POLICY "Usuários podem criar convites"
ON referrals FOR INSERT
TO authenticated
WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Sistema atualiza status de convites"
ON referrals FOR UPDATE
TO authenticated
USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Usuários veem próprias recompensas"
ON referral_rewards FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Sistema gerencia recompensas"
ON referral_rewards FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
    v_users_with_code INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_users_with_code 
    FROM users 
    WHERE referral_code IS NOT NULL;
    
    RAISE NOTICE '✅ Migração PART 3 concluída com sucesso!';
    RAISE NOTICE '📊 Tabelas: referrals, referral_rewards';
    RAISE NOTICE '⚡ Funções: 4';
    RAISE NOTICE '🔄 Trigger: trigger_user_referral_code';
    RAISE NOTICE '👁️ View: referral_stats';
    RAISE NOTICE '👤 Usuários com código: %', v_users_with_code;
END $$;
