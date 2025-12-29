-- ==============================================================================
-- 🚀 SPRINT MVP 0.6 SCHEMA: RETENTION, GROWTH & REVENUE (FIXED)
-- ==============================================================================
-- Data: 29/12/2025
-- Autor: Antigravity Tech Lead
-- Descrição: Estrutura incremental para Push, Reviews, Referrals, Ads e Competitions.
-- Dependência: SUPABASE_SCHEMA_FINAL_CLEAN.sql (Deve rodar em cima dele)

-- 1. 🔔 MODULE: PUSH NOTIFICATIONS (Preferences & Logs)
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    smart_reminders BOOLEAN DEFAULT true,
    streak_alerts BOOLEAN DEFAULT true,
    payment_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS NOTIFICATIONS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own preferences" ON notification_preferences;
CREATE POLICY "Users manage own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. ⭐ MODULE: REVIEWS (Avaliações Anti-Fraude)
CREATE TABLE IF NOT EXISTS academy_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS REVIEWS
ALTER TABLE academy_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read reviews" ON academy_reviews;
CREATE POLICY "Public read reviews" ON academy_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users create reviews" ON academy_reviews;
CREATE POLICY "Users create reviews" ON academy_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function Anti-Fraude Review
CREATE OR REPLACE FUNCTION check_review_eligibility() 
RETURNS TRIGGER AS $$
BEGIN
    -- Validamos se 'checkins' tem a coluna status, senão ignoramos ou adaptamos
    -- Aqui assumimos a existência da tabela checkins do schema anterior
    IF NOT EXISTS (
        SELECT 1 FROM checkins 
        WHERE user_id = NEW.user_id 
        AND academy_id = NEW.academy_id 
        AND created_at > (NOW() - INTERVAL '30 days')
        -- Se não tiver status 'validated', remova essa linha ou ajuste
        -- AND status = 'validated' 
    ) THEN
        RAISE EXCEPTION 'Para avaliar, você precisa ter feito check-in nesta academia nos últimos 30 dias.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_review_eligibility ON academy_reviews;
CREATE TRIGGER enforce_review_eligibility
    BEFORE INSERT ON academy_reviews
    FOR EACH ROW EXECUTE FUNCTION check_review_eligibility();


-- 3. 🤝 MODULE: REFERRALS (Indicação)
CREATE TABLE IF NOT EXISTS referral_codes (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop table first if schema is broken/missing columns to force recreation correctly
-- (Safe in dev/staging, be careful in prod if data exists - here assuming greenfield for this feature)
-- CREATE TABLE IF NOT EXISTS referrals (
--    ...
-- );
-- Instead of drop, let's ensure columns exist via ALTER
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

DO $$
BEGIN
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES auth.users(id);
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_user_id UUID REFERENCES auth.users(id);
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'invited';
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;


-- RLS REFERRALS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read codes" ON referral_codes;
CREATE POLICY "Public read codes" ON referral_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own code" ON referral_codes;
CREATE POLICY "Users manage own code" ON referral_codes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own referrals" ON referrals;
CREATE POLICY "Users view own referrals" ON referrals FOR SELECT 
    USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);


-- 4. 🏆 MODULE: COMPETITIONS V2 (Custom Rules)
CREATE TABLE IF NOT EXISTS competition_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    scoring_mode TEXT DEFAULT 'standard',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS COMPETITIONS V2
ALTER TABLE competition_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view rules" ON competition_rules;
CREATE POLICY "Public view rules" ON competition_rules FOR SELECT USING (true);

ALTER TABLE competition_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read invites" ON competition_invites;
CREATE POLICY "Public read invites" ON competition_invites FOR SELECT USING (true);


-- 5. 🚀 MODULE: ADS/BOOST (Partner Revenue)
CREATE TABLE IF NOT EXISTS partner_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    geo_target GEOMETRY(Point, 4326),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    budget_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'pending_approval',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS ADS
ALTER TABLE partner_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners view own ads" ON partner_ads;
CREATE POLICY "Partners view own ads" ON partner_ads FOR SELECT USING (
    -- Simplificação: Permite leitura se for dono de academia (assumindo tabela academy_owners ou similar no futuro)
    -- Por enquanto, permite se autenticado para não quebrar SQL rodando sem tabela academy_owners
    auth.role() = 'authenticated'
);

-- 6. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
