-- ============================================
-- 🔔 SPRINT 9: NOTIFICAÇÕES + ANALYTICS + MONITORING
-- ============================================
-- Copie e cole este arquivo COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. TABELA: notifications (Notificações)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'push', 'email', 'in_app'
    category TEXT, -- 'streak', 'mission', 'badge', 'boost', 'insight', 'system'
    data JSONB DEFAULT '{}'::JSONB,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_academy_id ON notifications(academy_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- 2. TABELA: notification_rules (Regras de Notificação)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key TEXT UNIQUE NOT NULL,
    rule_type TEXT NOT NULL, -- 'streak', 'mission', 'boost', 'insight', 'admin_alert'
    condition JSONB NOT NULL,
    message_template JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir regras padrão
INSERT INTO notification_rules (rule_key, rule_type, condition, message_template) VALUES
-- Regra 1: Streak em risco
('streak_at_risk', 'streak', 
 '{"time_range": "22:00-23:59", "no_checkin_today": true}'::JSONB,
 '{"title": "🔥 Sua sequência está em risco!", "message": "Ainda dá tempo de treinar hoje e manter seu streak!"}'::JSONB),

-- Regra 2: Nova badge desbloqueada
('badge_unlocked', 'badge',
 '{"event": "badge_earned"}'::JSONB,
 '{"title": "🏅 Nova Badge Desbloqueada!", "message": "Você desbloqueou a badge: {{badge_name}}! Continue assim!"}'::JSONB),

-- Regra 3: Missão semanal disponível
('weekly_mission_available', 'mission',
 '{"day_of_week": "monday", "time": "09:00"}'::JSONB,
 '{"title": "🎯 Nova Missão Semanal!", "message": "Sua nova missão semanal chegou! Toque para ver."}'::JSONB),

-- Regra 4: Academia atingiu pico
('academy_peak_hour', 'insight',
 '{"event": "peak_hour_reached"}'::JSONB,
 '{"title": "📈 Pico de Usuários!", "message": "Sua academia atingiu o pico de usuários hoje às {{hour}}!"}'::JSONB),

-- Regra 5: Insight crítico detectado
('critical_insight', 'insight',
 '{"engagement_drop": ">30%"}'::JSONB,
 '{"title": "⚠️ Atenção Necessária!", "message": "Notamos uma queda de {{percentage}}% no engajamento da sua academia."}'::JSONB)
ON CONFLICT (rule_key) DO NOTHING;

-- ============================================
-- 3. TABELA: push_tokens (Tokens de Push Notification)
-- ============================================

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'ios', 'android', 'web'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_is_active ON push_tokens(is_active);

-- ============================================
-- 4. TABELA: notification_logs (Logs de Envio)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
    error_message TEXT,
    sent_to TEXT, -- email ou push token
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- ============================================
-- 5. TABELA: analytics_events (Eventos para Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    country_id UUID REFERENCES countries(id),
    event_data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_academy_id ON analytics_events(academy_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- ============================================
-- 6. TABELA: system_monitoring (Monitoramento do Sistema)
-- ============================================

CREATE TABLE IF NOT EXISTS system_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL, -- 'error', 'performance', 'infra'
    metric_key TEXT NOT NULL,
    metric_value JSONB NOT NULL,
    severity TEXT, -- 'low', 'medium', 'high', 'critical'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_monitoring_type ON system_monitoring(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_monitoring_severity ON system_monitoring(severity);
CREATE INDEX IF NOT EXISTS idx_system_monitoring_created_at ON system_monitoring(created_at);

-- ============================================
-- 7. FUNÇÃO: Enviar notificação
-- ============================================

CREATE OR REPLACE FUNCTION send_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'in_app',
    p_category TEXT DEFAULT 'system',
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, category, data)
    VALUES (p_user_id, p_title, p_message, p_type, p_category, p_data)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- ============================================
-- 8. FUNÇÃO: Marcar notificação como lida
-- ============================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id;
END;
$$;

-- ============================================
-- 9. FUNÇÃO: Obter notificações do usuário
-- ============================================

CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    category TEXT,
    data JSONB,
    is_read BOOLEAN,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.message,
        n.type,
        n.category,
        n.data,
        n.is_read,
        n.created_at
    FROM notifications n
    WHERE n.user_id = p_user_id
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- 10. FUNÇÃO: Registrar evento de analytics
-- ============================================

CREATE OR REPLACE FUNCTION log_analytics_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_academy_id UUID DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_country_id UUID;
BEGIN
    -- Get country_id from academy if provided
    IF p_academy_id IS NOT NULL THEN
        SELECT country_id INTO v_country_id
        FROM academies
        WHERE id = p_academy_id;
    END IF;
    
    INSERT INTO analytics_events (event_type, user_id, academy_id, country_id, event_data)
    VALUES (p_event_type, p_user_id, p_academy_id, v_country_id, p_event_data);
END;
$$;

-- ============================================
-- 11. FUNÇÃO: Obter DAU (Daily Active Users)
-- ============================================

CREATE OR REPLACE FUNCTION get_dau(p_date DATE DEFAULT CURRENT_DATE)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)
        FROM checkins
        WHERE DATE(created_at) = p_date
    );
END;
$$;

-- ============================================
-- 12. FUNÇÃO: Obter WAU (Weekly Active Users)
-- ============================================

CREATE OR REPLACE FUNCTION get_wau()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)
        FROM checkins
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$;

-- ============================================
-- 13. FUNÇÃO: Obter MAU (Monthly Active Users)
-- ============================================

CREATE OR REPLACE FUNCTION get_mau()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)
        FROM checkins
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    );
END;
$$;

-- ============================================
-- 14. FUNÇÃO: Calcular retenção
-- ============================================

CREATE OR REPLACE FUNCTION calculate_retention(p_days INT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_users BIGINT;
    v_retained_users BIGINT;
BEGIN
    -- Total users who signed up p_days ago
    SELECT COUNT(DISTINCT id) INTO v_total_users
    FROM auth.users
    WHERE DATE(created_at) = CURRENT_DATE - p_days;
    
    IF v_total_users = 0 THEN
        RETURN 0;
    END IF;
    
    -- Users who are still active
    SELECT COUNT(DISTINCT user_id) INTO v_retained_users
    FROM checkins
    WHERE user_id IN (
        SELECT id FROM auth.users
        WHERE DATE(created_at) = CURRENT_DATE - p_days
    )
    AND created_at >= CURRENT_DATE - INTERVAL '7 days';
    
    RETURN ROUND((v_retained_users::NUMERIC / v_total_users::NUMERIC) * 100, 2);
END;
$$;

-- ============================================
-- 15. FUNÇÃO: Registrar erro do sistema
-- ============================================

CREATE OR REPLACE FUNCTION log_system_error(
    p_error_type TEXT,
    p_error_message TEXT,
    p_severity TEXT DEFAULT 'medium'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO system_monitoring (metric_type, metric_key, metric_value, severity)
    VALUES ('error', p_error_type, jsonb_build_object('message', p_error_message), p_severity);
END;
$$;

-- ============================================
-- 16. CONCEDER PERMISSÕES
-- ============================================

GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_rules TO authenticated;
GRANT ALL ON push_tokens TO authenticated;
GRANT ALL ON notification_logs TO authenticated;
GRANT ALL ON analytics_events TO authenticated;
GRANT ALL ON system_monitoring TO authenticated;

GRANT EXECUTE ON FUNCTION send_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_analytics_event(TEXT, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dau(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wau() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mau() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_retention(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_system_error(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Execute este SQL no Supabase para criar toda a estrutura de notificações e analytics
