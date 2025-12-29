-- ============================================
-- 🌍 SPRINT 8: MULTIPAÍS + INFRAESTRUTURA GLOBAL
-- ============================================
-- Copie e cole este arquivo COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. TABELA: countries (Países)
-- ============================================

CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- BR, US, MX, PT, ES
    currency TEXT NOT NULL, -- BRL, USD, MXN, EUR
    currency_symbol TEXT NOT NULL, -- R$, $, €
    locale TEXT NOT NULL, -- pt-BR, en-US, es-MX
    timezone_default TEXT NOT NULL, -- America/Sao_Paulo, America/New_York
    flag_emoji TEXT, -- 🇧🇷, 🇺🇸, 🇲🇽
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir países iniciais
INSERT INTO countries (name, code, currency, currency_symbol, locale, timezone_default, flag_emoji) VALUES
('Brasil', 'BR', 'BRL', 'R$', 'pt-BR', 'America/Sao_Paulo', '🇧🇷'),
('Estados Unidos', 'US', 'USD', '$', 'en-US', 'America/New_York', '🇺🇸'),
('México', 'MX', 'MXN', '$', 'es-MX', 'America/Mexico_City', '🇲🇽'),
('Portugal', 'PT', 'EUR', '€', 'pt-PT', 'Europe/Lisbon', '🇵🇹'),
('Espanha', 'ES', 'EUR', '€', 'es-ES', 'Europe/Madrid', '🇪🇸'),
('Reino Unido', 'GB', 'GBP', '£', 'en-GB', 'Europe/London', '🇬🇧'),
('Canadá', 'CA', 'CAD', '$', 'en-CA', 'America/Toronto', '🇨🇦')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. ALTERAR TABELA: academies (adicionar campos internacionais)
-- ============================================

-- Adicionar colunas se não existirem
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt-BR';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_academies_country_id ON academies(country_id);

-- Atualizar academias existentes para Brasil (padrão)
UPDATE academies 
SET country_id = (SELECT id FROM countries WHERE code = 'BR' LIMIT 1)
WHERE country_id IS NULL;

-- ============================================
-- 3. TABELA: plan_prices_by_country (Preços por País)
-- ============================================

CREATE TABLE IF NOT EXISTS plan_prices_by_country (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT NOT NULL, -- 'user_monthly', 'user_yearly', 'academy_monthly'
    price_cents INT NOT NULL,
    currency TEXT NOT NULL,
    stripe_price_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(country_id, plan_type)
);

-- Inserir preços por país
INSERT INTO plan_prices_by_country (country_id, plan_type, price_cents, currency) VALUES
-- Brasil
((SELECT id FROM countries WHERE code = 'BR'), 'user_monthly', 1290, 'BRL'),
((SELECT id FROM countries WHERE code = 'BR'), 'user_yearly', 12900, 'BRL'),
((SELECT id FROM countries WHERE code = 'BR'), 'academy_monthly', 9900, 'BRL'),

-- Estados Unidos
((SELECT id FROM countries WHERE code = 'US'), 'user_monthly', 499, 'USD'),
((SELECT id FROM countries WHERE code = 'US'), 'user_yearly', 4999, 'USD'),
((SELECT id FROM countries WHERE code = 'US'), 'academy_monthly', 2999, 'USD'),

-- México
((SELECT id FROM countries WHERE code = 'MX'), 'user_monthly', 7900, 'MXN'),
((SELECT id FROM countries WHERE code = 'MX'), 'user_yearly', 79000, 'MXN'),
((SELECT id FROM countries WHERE code = 'MX'), 'academy_monthly', 49900, 'MXN'),

-- Portugal/Espanha (EUR)
((SELECT id FROM countries WHERE code = 'PT'), 'user_monthly', 399, 'EUR'),
((SELECT id FROM countries WHERE code = 'PT'), 'user_yearly', 3999, 'EUR'),
((SELECT id FROM countries WHERE code = 'PT'), 'academy_monthly', 2499, 'EUR')
ON CONFLICT (country_id, plan_type) DO NOTHING;

-- ============================================
-- 4. TABELA: local_rules (Regulamentações Locais)
-- ============================================

CREATE TABLE IF NOT EXISTS local_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE NOT NULL,
    rule_key TEXT NOT NULL,
    rule_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(country_id, rule_key)
);

-- Inserir regras por país
INSERT INTO local_rules (country_id, rule_key, rule_value, description) VALUES
-- Brasil
((SELECT id FROM countries WHERE code = 'BR'), 'max_checkins_per_day', '{"limit": 5}', 'Máximo de check-ins por dia'),
((SELECT id FROM countries WHERE code = 'BR'), 'require_cpf', '{"required": true}', 'CPF obrigatório no cadastro'),
((SELECT id FROM countries WHERE code = 'BR'), 'data_retention_days', '{"days": 365}', 'Retenção de dados por 1 ano'),

-- Estados Unidos
((SELECT id FROM countries WHERE code = 'US'), 'max_checkins_per_day', '{"limit": 3}', 'Maximum check-ins per day'),
((SELECT id FROM countries WHERE code = 'US'), 'require_ssn', '{"required": false}', 'SSN not required'),
((SELECT id FROM countries WHERE code = 'US'), 'data_retention_days', '{"days": 730}', 'Data retention for 2 years'),

-- Europa (GDPR)
((SELECT id FROM countries WHERE code = 'PT'), 'gdpr_consent', '{"required": true}', 'Consentimento GDPR obrigatório'),
((SELECT id FROM countries WHERE code = 'PT'), 'data_retention_days', '{"days": 90}', 'Retenção mínima por GDPR'),
((SELECT id FROM countries WHERE code = 'PT'), 'right_to_erasure', '{"enabled": true}', 'Direito ao esquecimento')
ON CONFLICT (country_id, rule_key) DO NOTHING;

-- ============================================
-- 5. TABELA: global_metrics (Métricas Globais por País)
-- ============================================

CREATE TABLE IF NOT EXISTS global_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE NOT NULL,
    metric_date DATE NOT NULL,
    total_academies INT DEFAULT 0,
    total_users INT DEFAULT 0,
    total_checkins INT DEFAULT 0,
    revenue_cents INT DEFAULT 0,
    currency TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(country_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_global_metrics_country_date ON global_metrics(country_id, metric_date);

-- ============================================
-- 6. FUNÇÃO: Obter preço por país
-- ============================================

CREATE OR REPLACE FUNCTION get_price_by_country(
    p_country_code TEXT,
    p_plan_type TEXT
)
RETURNS TABLE (
    price_cents INT,
    currency TEXT,
    currency_symbol TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ppc.price_cents,
        ppc.currency,
        c.currency_symbol
    FROM plan_prices_by_country ppc
    JOIN countries c ON c.id = ppc.country_id
    WHERE c.code = p_country_code
      AND ppc.plan_type = p_plan_type
      AND ppc.is_active = true
    LIMIT 1;
END;
$$;

-- ============================================
-- 7. FUNÇÃO: Converter timestamp para timezone da academia
-- ============================================

CREATE OR REPLACE FUNCTION convert_to_academy_timezone(
    p_timestamp TIMESTAMP,
    p_academy_id UUID
)
RETURNS TIMESTAMP
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timezone TEXT;
BEGIN
    SELECT timezone INTO v_timezone
    FROM academies
    WHERE id = p_academy_id;
    
    IF v_timezone IS NULL THEN
        v_timezone := 'UTC';
    END IF;
    
    RETURN p_timestamp AT TIME ZONE 'UTC' AT TIME ZONE v_timezone;
END;
$$;

-- ============================================
-- 8. FUNÇÃO: Obter estatísticas globais por país
-- ============================================

CREATE OR REPLACE FUNCTION get_global_stats_by_country()
RETURNS TABLE (
    country_code TEXT,
    country_name TEXT,
    flag_emoji TEXT,
    total_academies BIGINT,
    total_users BIGINT,
    total_checkins_today BIGINT,
    total_checkins_week BIGINT,
    revenue_month_cents BIGINT,
    currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.code,
        c.name,
        c.flag_emoji,
        COUNT(DISTINCT a.id) as total_academies,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE 
            WHEN ch.created_at >= CURRENT_DATE THEN ch.id 
        END) as total_checkins_today,
        COUNT(DISTINCT CASE 
            WHEN ch.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN ch.id 
        END) as total_checkins_week,
        COALESCE(SUM(CASE 
            WHEN us.created_at >= CURRENT_DATE - INTERVAL '30 days' 
            THEN ppc.price_cents 
        END), 0) as revenue_month_cents,
        c.currency
    FROM countries c
    LEFT JOIN academies a ON a.country_id = c.id
    LEFT JOIN users u ON u.id = a.owner_id
    LEFT JOIN checkins ch ON ch.academy_id = a.id
    LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
    LEFT JOIN plan_prices_by_country ppc ON ppc.country_id = c.id AND ppc.plan_type = 'user_monthly'
    WHERE c.is_active = true
    GROUP BY c.id, c.code, c.name, c.flag_emoji, c.currency
    ORDER BY total_academies DESC;
END;
$$;

-- ============================================
-- 9. FUNÇÃO: Atualizar métricas globais (rodar diariamente)
-- ============================================

CREATE OR REPLACE FUNCTION update_global_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_country RECORD;
BEGIN
    FOR v_country IN SELECT id, currency FROM countries WHERE is_active = true
    LOOP
        INSERT INTO global_metrics (
            country_id,
            metric_date,
            total_academies,
            total_users,
            total_checkins,
            revenue_cents,
            currency
        )
        SELECT 
            v_country.id,
            CURRENT_DATE,
            COUNT(DISTINCT a.id),
            COUNT(DISTINCT u.id),
            COUNT(ch.id),
            0, -- Revenue calculation would go here
            v_country.currency
        FROM academies a
        LEFT JOIN users u ON u.id = a.owner_id
        LEFT JOIN checkins ch ON ch.academy_id = a.id AND ch.created_at >= CURRENT_DATE
        WHERE a.country_id = v_country.id
        ON CONFLICT (country_id, metric_date) 
        DO UPDATE SET
            total_academies = EXCLUDED.total_academies,
            total_users = EXCLUDED.total_users,
            total_checkins = EXCLUDED.total_checkins;
    END LOOP;
END;
$$;

-- ============================================
-- 10. FUNÇÃO: Verificar regra local
-- ============================================

CREATE OR REPLACE FUNCTION check_local_rule(
    p_country_code TEXT,
    p_rule_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule_value JSONB;
BEGIN
    SELECT lr.rule_value INTO v_rule_value
    FROM local_rules lr
    JOIN countries c ON c.id = lr.country_id
    WHERE c.code = p_country_code
      AND lr.rule_key = p_rule_key
      AND lr.is_active = true;
    
    RETURN COALESCE(v_rule_value, '{}'::JSONB);
END;
$$;

-- ============================================
-- 11. VIEW: Academias com informações de país
-- ============================================

CREATE OR REPLACE VIEW academies_with_country AS
SELECT 
    a.*,
    c.name as country_name,
    c.code as country_code,
    c.currency as country_currency,
    c.currency_symbol,
    c.locale as country_locale,
    c.flag_emoji
FROM academies a
LEFT JOIN countries c ON c.id = a.country_id;

-- ============================================
-- 12. CONCEDER PERMISSÕES
-- ============================================

GRANT ALL ON countries TO authenticated;
GRANT ALL ON plan_prices_by_country TO authenticated;
GRANT ALL ON local_rules TO authenticated;
GRANT ALL ON global_metrics TO authenticated;
GRANT SELECT ON academies_with_country TO authenticated;

GRANT EXECUTE ON FUNCTION get_price_by_country(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_to_academy_timezone(TIMESTAMP, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_stats_by_country() TO authenticated;
GRANT EXECUTE ON FUNCTION check_local_rule(TEXT, TEXT) TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Execute este SQL no Supabase para criar toda a estrutura multipaís
