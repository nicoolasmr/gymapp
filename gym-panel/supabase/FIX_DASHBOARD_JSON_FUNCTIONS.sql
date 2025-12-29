-- ============================================
-- 🚑 HOTFIX: CORREÇÃO DE UNNEST EM COLUNAS JSONB
-- ============================================
-- O campo 'amenities' foi migrado para JSONB, então a função UNNEST (que é para arrays SQL)
-- parou de funcionar. Subsituímos por jsonb_array_elements_text.

-- 1. CORREÇÃO DA FUNÇÃO get_dashboard_metrics
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
    
    -- Métricas de hoje
    v_total_checkins_today INT;
    v_unique_users_today INT;
    v_peak_hour_today INT;
    v_modality_usage_today JSON;
    
    -- Métricas da semana
    v_total_checkins_week INT;
    v_unique_users_week INT;
    v_checkins_by_day JSON;
    
    -- Saúde da academia
    v_avg_daily_last_30 NUMERIC;
    v_avg_daily_last_7 NUMERIC;
    v_churn_risk BOOLEAN;
    
    -- Financeiro
    v_estimated_revenue_week NUMERIC;
    v_most_popular_plan TEXT;
BEGIN
    -- Define os períodos
    v_today_start := DATE_TRUNC('day', NOW());
    v_week_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
    v_month_start := DATE_TRUNC('day', NOW() - INTERVAL '30 days');
    
    -- === MÉTRICAS DE HOJE ===
    
    -- Total de check-ins hoje
    SELECT COUNT(*)
    INTO v_total_checkins_today
    FROM checkins
    WHERE academy_id = p_academy_id
      AND created_at >= v_today_start;
    
    -- Usuários únicos hoje
    SELECT COUNT(DISTINCT user_id)
    INTO v_unique_users_today
    FROM checkins
    WHERE academy_id = p_academy_id
      AND created_at >= v_today_start;
    
    -- Horário de pico hoje (hora com mais check-ins)
    SELECT EXTRACT(HOUR FROM created_at)::INT
    INTO v_peak_hour_today
    FROM checkins
    WHERE academy_id = p_academy_id
      AND created_at >= v_today_start
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Se não houver check-ins hoje, define como NULL
    IF v_peak_hour_today IS NULL THEN
        v_peak_hour_today := 0;
    END IF;
    
    -- FIX: Usar jsonb_array_elements_text em vez de UNNEST
    SELECT json_agg(json_build_object('name', amenity, 'count', 1))
    INTO v_modality_usage_today
    FROM (
        SELECT jsonb_array_elements_text(amenities) as amenity
        FROM academies
        WHERE id = p_academy_id
        LIMIT 3
    ) sub;
    
    IF v_modality_usage_today IS NULL THEN
        v_modality_usage_today := '[]'::JSON;
    END IF;
    
    -- === MÉTRICAS DA SEMANA ===
    
    -- Total de check-ins na semana
    SELECT COUNT(*)
    INTO v_total_checkins_week
    FROM checkins
    WHERE academy_id = p_academy_id
      AND created_at >= v_week_start;
    
    -- Usuários únicos na semana
    SELECT COUNT(DISTINCT user_id)
    INTO v_unique_users_week
    FROM checkins
    WHERE academy_id = p_academy_id
      AND created_at >= v_week_start;
    
    -- Check-ins por dia nos últimos 7 dias
    SELECT json_agg(
        json_build_object(
            'date', day::DATE,
            'count', COALESCE(checkin_count, 0)
        )
        ORDER BY day
    )
    INTO v_checkins_by_day
    FROM (
        SELECT 
            generate_series(
                DATE_TRUNC('day', NOW() - INTERVAL '6 days'),
                DATE_TRUNC('day', NOW()),
                '1 day'::INTERVAL
            ) AS day
    ) days
    LEFT JOIN (
        SELECT 
            DATE_TRUNC('day', created_at) AS checkin_day,
            COUNT(*) AS checkin_count
        FROM checkins
        WHERE academy_id = p_academy_id
          AND created_at >= v_week_start
        GROUP BY DATE_TRUNC('day', created_at)
    ) checkins_data ON days.day = checkins_data.checkin_day;
    
    -- === SAÚDE DA ACADEMIA ===
    
    -- Média diária dos últimos 30 dias
    SELECT COALESCE(COUNT(*) / 30.0, 0)
    INTO v_avg_daily_last_30
    FROM checkins
    WHERE academy_id = p_academy_id
      AND created_at >= v_month_start;
    
    -- Média diária dos últimos 7 dias
    SELECT COALESCE(COUNT(*) / 7.0, 0)
    INTO v_avg_daily_last_7
    FROM checkins
    WHERE academy_id = p_academy_id
      AND created_at >= v_week_start;
    
    -- Indicador de risco de churn
    v_churn_risk := (v_avg_daily_last_7 < v_avg_daily_last_30 * 0.8);
    
    -- === FINANCEIRO ===
    
    -- Receita estimada na semana (assumindo R$ 15 por check-in como média)
    v_estimated_revenue_week := v_total_checkins_week * 15.0;
    
    -- Plano mais popular (placeholder se memberships não existir ou estiver vazia)
    SELECT 
        COALESCE(
            (SELECT CASE 
                WHEN plan_id = 1 THEN 'Solo'
                WHEN plan_id = 2 THEN 'Família'
                ELSE 'Outro'
             END
             FROM memberships 
             WHERE status = 'active' 
             GROUP BY plan_id 
             ORDER BY COUNT(*) DESC 
             LIMIT 1), 
            'N/A'
        )
    INTO v_most_popular_plan;
    
    -- === CONSTRUIR RESULTADO JSON ===
    
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

-- 2. CORREÇÃO DA FUNÇÃO get_academy_insights
CREATE OR REPLACE FUNCTION get_academy_insights(p_academy_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_today_start TIMESTAMP;
    v_week_start TIMESTAMP;
    v_month_start TIMESTAMP;
    
    -- Métricas base
    v_avg_daily_last_7 NUMERIC;
    v_avg_daily_last_30 NUMERIC;
    v_percent_change NUMERIC;
    v_engagement_status TEXT;
    v_engagement_message TEXT;
    v_severity TEXT;
    
    -- Horários
    v_busiest_hour INT;
    v_slowest_hour INT;
    v_peak_message TEXT;
    
    -- Modalidades
    v_most_popular_modality TEXT;
    v_least_popular_modality TEXT;
    v_modality_message TEXT;
    
    -- Previsão
    v_tomorrow_estimated INT;
    v_prediction_message TEXT;
    
    -- Sugestões
    v_suggestions JSON;
BEGIN
    -- Define períodos
    v_today_start := DATE_TRUNC('day', NOW());
    v_week_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
    v_month_start := DATE_TRUNC('day', NOW() - INTERVAL '30 days');
    
    -- === ANÁLISE DE ENGAJAMENTO ===
    
    -- Média diária últimos 7 dias
    SELECT COALESCE(COUNT(*) / 7.0, 0) INTO v_avg_daily_last_7
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_week_start;
    
    -- Média diária últimos 30 dias
    SELECT COALESCE(COUNT(*) / 30.0, 0) INTO v_avg_daily_last_30
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_month_start;
    
    -- Calcular variação percentual
    IF v_avg_daily_last_30 > 0 THEN
        v_percent_change := ((v_avg_daily_last_7 - v_avg_daily_last_30) / v_avg_daily_last_30) * 100;
    ELSE
        v_percent_change := 0;
    END IF;
    
    -- Determinar status e severidade
    IF v_percent_change >= 10 THEN
        v_engagement_status := 'rising';
        v_severity := 'low';
        v_engagement_message := 'Excelente! Sua academia está com ' || ROUND(v_percent_change, 1) || '% mais check-ins. Continue com o bom trabalho!';
    ELSIF v_percent_change >= -10 THEN
        v_engagement_status := 'stable';
        v_severity := 'low';
        v_engagement_message := 'Engajamento estável. Mantenha a consistência e busque pequenas melhorias.';
    ELSIF v_percent_change >= -20 THEN
        v_engagement_status := 'falling';
        v_severity := 'medium';
        v_engagement_message := 'Queda de ' || ABS(ROUND(v_percent_change, 1)) || '% nos últimos 7 dias. Atenção: possível início de evasão.';
    ELSIF v_percent_change >= -30 THEN
        v_engagement_status := 'falling';
        v_severity := 'high';
        v_engagement_message := 'Alerta! Queda significativa de ' || ABS(ROUND(v_percent_change, 1)) || '% indica evasão de alunos.';
    ELSE
        v_engagement_status := 'falling';
        v_severity := 'critical';
        v_engagement_message := 'CRÍTICO: Queda de ' || ABS(ROUND(v_percent_change, 1)) || '% nos check-ins. Ação imediata necessária!';
    END IF;
    
    -- === ANÁLISE DE HORÁRIOS ===
    
    -- Horário mais movimentado
    SELECT COALESCE(EXTRACT(HOUR FROM created_at)::INT, 18) INTO v_busiest_hour
    FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_week_start
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY COUNT(*) DESC LIMIT 1;
    
    -- Horário menos movimentado (entre 6h e 22h)
    SELECT COALESCE(hour, 13) INTO v_slowest_hour
    FROM (
        SELECT generate_series(6, 22) AS hour
    ) hours
    LEFT JOIN (
        SELECT EXTRACT(HOUR FROM created_at)::INT AS hour, COUNT(*) AS count
        FROM checkins WHERE academy_id = p_academy_id AND created_at >= v_week_start
        GROUP BY EXTRACT(HOUR FROM created_at)
    ) checkins_by_hour USING (hour)
    ORDER BY COALESCE(count, 0) ASC LIMIT 1;
    
    v_peak_message := 'Pico entre ' || v_busiest_hour || 'h-' || (v_busiest_hour + 1) || 'h. Horário vazio: ' || v_slowest_hour || 'h-' || (v_slowest_hour + 1) || 'h.';
    
    -- === ANÁLISE DE MODALIDADES (FIX: jsonb_array_elements_text) ===
    
    -- Modalidade mais popular (usando amenities da academia como proxy)
    SELECT COALESCE(amenity, 'Cross') INTO v_most_popular_modality
    FROM (
        SELECT jsonb_array_elements_text(amenities) AS amenity FROM academies WHERE id = p_academy_id
    ) sub LIMIT 1;
    
    -- Modalidade menos popular
    SELECT COALESCE(amenity, 'Funcional') INTO v_least_popular_modality
    FROM (
        SELECT jsonb_array_elements_text(amenities) AS amenity FROM academies WHERE id = p_academy_id
    ) sub ORDER BY RANDOM() LIMIT 1 OFFSET 1;
    
    v_modality_message := v_least_popular_modality || ' apresenta baixa adesão. Considere ajustar horários ou criar campanha específica.';
    
    -- === PREVISÃO ===
    
    -- Previsão simples baseada em média móvel + tendência
    v_tomorrow_estimated := ROUND(v_avg_daily_last_7 * (1 + (v_percent_change / 100)))::INT;
    
    IF v_percent_change > 0 THEN
        v_prediction_message := 'Tendência positiva: espera-se ' || v_tomorrow_estimated || ' check-ins amanhã (' || ROUND(v_percent_change, 1) || '% acima da média).';
    ELSE
        v_prediction_message := 'Espera-se ' || v_tomorrow_estimated || ' check-ins amanhã, similar à média recente.';
    END IF;
    
    -- === SUGESTÕES AUTOMÁTICAS ===
    
    v_suggestions := json_build_array(
        CASE 
            WHEN v_percent_change < -15 THEN 'Crie uma campanha de reengajamento com desconto ou benefício exclusivo.'
            WHEN v_percent_change < 0 THEN 'Envie mensagens motivacionais para alunos inativos há mais de 3 dias.'
            ELSE 'Publique depoimentos de alunos satisfeitos nas redes sociais.'
        END,
        'Reforce a equipe entre ' || v_busiest_hour || 'h e ' || (v_busiest_hour + 1) || 'h para melhor atendimento.',
        'Ofereça aula experimental de ' || v_least_popular_modality || ' para aumentar adesão.',
        CASE 
            WHEN v_slowest_hour BETWEEN 6 AND 12 THEN 'Crie promoção "Manhã Ativa" para horários de baixo movimento.'
            WHEN v_slowest_hour BETWEEN 13 AND 17 THEN 'Lance desafio "Tarde Fitness" com recompensas para check-ins entre 13h-17h.'
            ELSE 'Organize evento especial no horário de menor movimento para atrair novos alunos.'
        END
    );
    
    -- === CONSTRUIR RESULTADO ===
    
    v_result := json_build_object(
        'engagement', json_build_object(
            'status', v_engagement_status,
            'percent_change', ROUND(v_percent_change, 1),
            'message', v_engagement_message,
            'severity', v_severity
        ),
        'peak_hours', json_build_object(
            'busiest_hour', v_busiest_hour || ':00',
            'slowest_hour', v_slowest_hour || ':00',
            'message', v_peak_message
        ),
        'modalities', json_build_object(
            'most_popular', v_most_popular_modality,
            'least_popular', v_least_popular_modality,
            'message', v_modality_message
        ),
        'predictions', json_build_object(
            'tomorrow_estimated_checkins', v_tomorrow_estimated,
            'message', v_prediction_message
        ),
        'suggestions', v_suggestions
    );
    
    RETURN v_result;
END;
$$;
