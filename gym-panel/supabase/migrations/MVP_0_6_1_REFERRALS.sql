-- ==============================================================================
-- 🚀 MVP 0.6.1: REFERRAL SYSTEM (NUCLEAR FIX v3)
-- ==============================================================================

-- 0. Limpeza de Dependências Ocultas
DROP VIEW IF EXISTS referral_stats CASCADE; -- Matando a view antiga que travava o drop
DROP VIEW IF EXISTS view_referral_performance CASCADE;

-- 1. Garante tabela referrals
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES auth.users(id);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_user_id UUID REFERENCES auth.users(id);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'invited';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Tabela Rewards (Recria Limpo)
DROP TABLE IF EXISTS referral_rewards CASCADE;

CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) NOT NULL,
    referred_user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'pending',
    stripe_transaction_id TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT unique_reward_per_referral UNIQUE (referrer_id, referred_user_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_rewards_referrer ON referral_rewards(referrer_id);

-- 4. View de Performance (Recria)
CREATE OR REPLACE VIEW view_referral_performance AS
SELECT 
    r.referrer_id,
    u.email as referrer_email,
    COUNT(r.id) as total_invites,
    COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as total_converted,
    COALESCE(SUM(rw.amount_cents), 0) as total_earned_cents
FROM referrals r
JOIN users u ON r.referrer_id = u.id
LEFT JOIN referral_rewards rw ON r.referrer_id = rw.referrer_id AND r.referred_user_id = rw.referred_user_id
GROUP BY r.referrer_id, u.email
ORDER BY total_converted DESC;

-- 5. Policies
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rewards" ON referral_rewards 
    FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Service Role manages rewards" ON referral_rewards 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON referral_rewards TO service_role;
GRANT SELECT ON view_referral_performance TO authenticated;
GRANT SELECT ON view_referral_performance TO service_role;
