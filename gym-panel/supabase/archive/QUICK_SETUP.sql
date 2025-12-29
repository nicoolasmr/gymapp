-- ⚡ INSTRUÇÕES RÁPIDAS - COPIE E COLE NO SUPABASE SQL EDITOR

-- Este arquivo contém TODOS os comandos SQL necessários para a Sprint 3
-- Execute este arquivo COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. CRIAR FUNÇÃO DE MÉTRICAS DO DASHBOARD
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_academy_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_today_start TIMESTAMP;
    v_week_start TIMESTAMP;
    v_month_start TIMESTAMP;
    
    v_total_checkins_today INT;
    v_unique_users_today INT;
    v_peak_hour_today INT;
    v_modality_usage_today JSON;
    
    v_total_checkins_week INT;
    v_unique_users_week INT;
    v_checkins_by_day JSON;
    
    v_avg_daily_last_30 NUMERIC;
    v_avg_daily_last_7 NUMERIC;
    v_churn_risk BOOLEAN;
    
    v_estimated_revenue_week NUMERIC;
    v_most_popular_plan TEXT;
BEGIN
    v_today_start := DATE_TRUNC('day', NOW());
    v_week_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
    v_month_start := DATE_TRUNC('day', NOW() - INTERVAL '30 days');
    
    -- Check-ins hoje
    SELECT COUNT(*) INTO v_total_checkins_today
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_today_start;
    
    -- Usuários únicos hoje
    SELECT COUNT(DISTINCT user_id) INTO v_unique_users_today
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_today_start;
    
    -- Horário de pico
    SELECT COALESCE(EXTRACT(HOUR FROM created_at)::INT, 0) INTO v_peak_hour_today
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_today_start
    GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY COUNT(*) DESC LIMIT 1;
    
    -- Modalidades (placeholder)
    SELECT COALESCE(
        json_agg(json_build_object('name', amenity, 'count', 1)),
        '[]'::JSON
    ) INTO v_modality_usage_today
    FROM (
        SELECT UNNEST(amenities) as amenity FROM academies WHERE id = p_academy_id LIMIT 3
    ) sub;
    
    -- Check-ins na semana
    SELECT COUNT(*) INTO v_total_checkins_week
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_week_start;
    
    -- Usuários únicos na semana
    SELECT COUNT(DISTINCT user_id) INTO v_unique_users_week
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_week_start;
    
    -- Check-ins por dia (últimos 7 dias)
    SELECT json_agg(
        json_build_object('date', day::DATE, 'count', COALESCE(checkin_count, 0))
        ORDER BY day
    ) INTO v_checkins_by_day
    FROM (
        SELECT generate_series(
            DATE_TRUNC('day', NOW() - INTERVAL '6 days'),
            DATE_TRUNC('day', NOW()),
            '1 day'::INTERVAL
        ) AS day
    ) days
    LEFT JOIN (
        SELECT DATE_TRUNC('day', created_at) AS checkin_day, COUNT(*) AS checkin_count
        FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_week_start
        GROUP BY DATE_TRUNC('day', created_at)
    ) checkins_data ON days.day = checkins_data.checkin_day;
    
    -- Média diária últimos 30 dias
    SELECT COALESCE(COUNT(*) / 30.0, 0) INTO v_avg_daily_last_30
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_month_start;
    
    -- Média diária últimos 7 dias
    SELECT COALESCE(COUNT(*) / 7.0, 0) INTO v_avg_daily_last_7
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_week_start;
    
    -- Risco de churn
    v_churn_risk := (v_avg_daily_last_7 < v_avg_daily_last_30 * 0.8);
    
    -- Receita estimada
    v_estimated_revenue_week := v_total_checkins_week * 15.0;
    
    -- Plano mais popular
    SELECT COALESCE(
        CASE WHEN plan_id = 1 THEN 'Solo' WHEN plan_id = 2 THEN 'Família' ELSE 'Outro' END,
        'N/A'
    ) INTO v_most_popular_plan
    FROM memberships WHERE status = 'active'
    GROUP BY plan_id ORDER BY COUNT(*) DESC LIMIT 1;
    
    -- Construir JSON de retorno
    v_result := json_build_object(
        'today', json_build_object(
            'total_checkins', v_total_checkins_today,
            'unique_users', v_unique_users_today,
            'peak_hour', v_peak_hour_today,
            'modality_usage', v_modality_usage_today
        ),
        'week', json_build_object(
            'total_checkins', v_total_checkins_week,
            'unique_users', v_unique_users_week,
            'checkins_by_day', v_checkins_by_day
        ),
        'health', json_build_object(
            'avg_daily_last_30', ROUND(v_avg_daily_last_30, 2),
            'avg_daily_last_7', ROUND(v_avg_daily_last_7, 2),
            'churn_risk', v_churn_risk,
            'trend', CASE
                WHEN v_avg_daily_last_7 > v_avg_daily_last_30 * 1.1 THEN 'up'
                WHEN v_avg_daily_last_7 < v_avg_daily_last_30 * 0.9 THEN 'down'
                ELSE 'stable'
            END
        ),
        'financial', json_build_object(
            'estimated_revenue_week', ROUND(v_estimated_revenue_week, 2),
            'most_popular_plan', v_most_popular_plan,
            'avg_ticket', ROUND(v_estimated_revenue_week / NULLIF(v_unique_users_week, 0), 2)
        )
    );
    
    RETURN v_result;
END;
$$;

-- ============================================
-- 2. CONCEDER PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION get_dashboard_metrics(UUID) TO authenticated;

-- ============================================
-- 3. HABILITAR REALTIME (se ainda não estiver)
-- ============================================

-- Vá para: Database > Replication > checkins > Enable Realtime

-- ============================================
-- 4. TESTAR A FUNÇÃO
-- ============================================

-- Substitua 'YOUR-ACADEMY-UUID' pelo ID real de uma academia
-- SELECT get_dashboard_metrics('YOUR-ACADEMY-UUID');

-- ============================================
-- ✅ PRONTO! 
-- ============================================
-- Agora o dashboard está configurado para usar métricas reais.
-- Acesse /dashboard no painel para ver os resultados.
