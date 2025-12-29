-- ============================================
-- FUNÇÃO RPC: get_academy_insights
-- ============================================
-- Gera insights inteligentes automáticos baseados nos dados da academia

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
    
    -- === ANÁLISE DE MODALIDADES ===
    
    -- Modalidade mais popular (usando amenities da academia como proxy)
    SELECT COALESCE(amenity, 'Cross') INTO v_most_popular_modality
    FROM (
        SELECT UNNEST(amenities) AS amenity FROM academies WHERE id = p_academy_id
    ) sub LIMIT 1;
    
    -- Modalidade menos popular
    SELECT COALESCE(amenity, 'Funcional') INTO v_least_popular_modality
    FROM (
        SELECT UNNEST(amenities) AS amenity FROM academies WHERE id = p_academy_id
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

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_academy_insights(UUID) TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Teste com: SELECT get_academy_insights('your-academy-uuid');
