-- ==============================================================================
-- 🚀 MVP 0.7.2: PUSH NOTIFICATIONS ENGINE
-- ==============================================================================

-- 1. Tabela de Tokens de Push (Expo Push Tokens)
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_info JSONB, -- { platform: 'ios', model: 'iPhone 14' }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, expo_push_token)
);

-- 2. Tabela de Log de Notificações (Idempotência + Auditoria)
CREATE TABLE IF NOT EXISTS push_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'streak_risk', 'payment_failed', 'payment_success'
    dedup_key TEXT NOT NULL, -- Chave única para evitar duplicatas
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB, -- Payload extra (deep link, etc)
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'opened'
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dedup_key)
);

-- 3. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON user_push_tokens(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notif_log_user ON push_notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_status ON push_notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_notif_log_type ON push_notifications_log(notification_type);

-- 4. RPC: Registrar Token (Upsert)
CREATE OR REPLACE FUNCTION register_push_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_push_tokens (user_id, expo_push_token, device_info)
    VALUES (p_user_id, p_token, p_device_info)
    ON CONFLICT (user_id, expo_push_token) 
    DO UPDATE SET 
        is_active = true,
        updated_at = NOW(),
        device_info = EXCLUDED.device_info;
END;
$$;

-- 5. RPC: Buscar Usuários em Risco de Perder Streak (Exemplo de Trigger)
CREATE OR REPLACE FUNCTION get_users_at_streak_risk()
RETURNS TABLE(user_id UUID, streak_days INTEGER, last_checkin_date DATE, push_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        COALESCE(us.streak, 0) as streak_days,
        us.last_checkin::date,
        upt.expo_push_token
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    LEFT JOIN user_push_tokens upt ON u.id = upt.user_id AND upt.is_active = true
    WHERE 
        us.streak > 0 
        AND us.last_checkin::date < CURRENT_DATE -- Não treinou hoje
        AND upt.expo_push_token IS NOT NULL; -- Tem push habilitado
END;
$$;

-- 6. Policies (RLS)
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Usuários gerenciam seus próprios tokens
CREATE POLICY "Users manage own tokens" ON user_push_tokens 
    FOR ALL USING (auth.uid() = user_id);

-- Usuários veem seus próprios logs
CREATE POLICY "Users view own notifications" ON push_notifications_log 
    FOR SELECT USING (auth.uid() = user_id);

-- Service role pode tudo (para o cron job)
GRANT ALL ON user_push_tokens TO service_role;
GRANT ALL ON push_notifications_log TO service_role;
