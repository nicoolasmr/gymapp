-- ============================================
-- 🚀 SPRINT 6: ESCALABILIDADE + ONBOARDING
-- ============================================
-- Copie e cole este arquivo COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. CRIAR TABELA platform_events (Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS platform_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_platform_events_user_id ON platform_events(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_academy_id ON platform_events(academy_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_type ON platform_events(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_events_created_at ON platform_events(created_at DESC);

-- ============================================
-- 2. ADICIONAR CAMPO status NA TABELA academies
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'academies' AND column_name = 'status'
    ) THEN
        ALTER TABLE academies ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;
END $$;

-- ============================================
-- 3. FUNÇÃO: Calcular Health Score da Academia
-- ============================================

CREATE OR REPLACE FUNCTION calculate_academy_health_score(p_academy_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score INT := 0;
    v_details JSONB := '{}'::JSONB;
    
    -- Métricas
    v_total_checkins INT;
    v_avg_checkins_per_week NUMERIC;
    v_unique_users_last_30 INT;
    v_profile_completeness INT := 0;
    v_modalities_count INT;
    v_has_pricing BOOLEAN;
    v_avg_price NUMERIC;
    
    -- Scores parciais
    v_engagement_score INT := 0;
    v_profile_score INT := 0;
    v_pricing_score INT := 0;
    
    v_academy RECORD;
BEGIN
    -- Buscar dados da academia
    SELECT * INTO v_academy FROM academies WHERE id = p_academy_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('score', 0, 'status', 'not_found');
    END IF;
    
    -- === 1. ENGAGEMENT SCORE (40 pontos) ===
    
    -- Total de check-ins últimos 30 dias
    SELECT COUNT(*) INTO v_total_checkins
    FROM checkins 
    WHERE academy_id = p_academy_id 
      AND created_at >= NOW() - INTERVAL '30 days';
    
    -- Média semanal
    v_avg_checkins_per_week := v_total_checkins / 4.0;
    
    -- Usuários únicos últimos 30 dias
    SELECT COUNT(DISTINCT user_id) INTO v_unique_users_last_30
    FROM checkins 
    WHERE academy_id = p_academy_id 
      AND created_at >= NOW() - INTERVAL '30 days';
    
    -- Calcular score de engajamento
    IF v_avg_checkins_per_week >= 100 THEN
        v_engagement_score := 40;
    ELSIF v_avg_checkins_per_week >= 50 THEN
        v_engagement_score := 30;
    ELSIF v_avg_checkins_per_week >= 20 THEN
        v_engagement_score := 20;
    ELSIF v_avg_checkins_per_week >= 5 THEN
        v_engagement_score := 10;
    ELSE
        v_engagement_score := 0;
    END IF;
    
    -- === 2. PROFILE COMPLETENESS (30 pontos) ===
    
    IF v_academy.name IS NOT NULL AND LENGTH(v_academy.name) > 0 THEN
        v_profile_completeness := v_profile_completeness + 5;
    END IF;
    
    IF v_academy.address IS NOT NULL AND LENGTH(v_academy.address) > 0 THEN
        v_profile_completeness := v_profile_completeness + 5;
    END IF;
    
    IF v_academy.logo_url IS NOT NULL AND LENGTH(v_academy.logo_url) > 0 THEN
        v_profile_completeness := v_profile_completeness + 5;
    END IF;
    
    IF v_academy.description IS NOT NULL AND LENGTH(v_academy.description) > 50 THEN
        v_profile_completeness := v_profile_completeness + 5;
    END IF;
    
    IF v_academy.amenities IS NOT NULL AND jsonb_array_length(v_academy.amenities) > 0 THEN
        v_profile_completeness := v_profile_completeness + 5;
    END IF;
    
    IF v_academy.opening_hours IS NOT NULL THEN
        v_profile_completeness := v_profile_completeness + 5;
    END IF;
    
    v_profile_score := v_profile_completeness;
    
    -- === 3. PRICING & MODALITIES (30 pontos) ===
    
    -- Contar modalidades
    SELECT COUNT(*) INTO v_modalities_count
    FROM modality_plans
    WHERE academy_id = p_academy_id;
    
    -- Verificar se tem pricing
    SELECT EXISTS (
        SELECT 1 FROM modality_plans 
        WHERE academy_id = p_academy_id 
          AND monthly_price > 0
    ) INTO v_has_pricing;
    
    IF v_modalities_count >= 3 THEN
        v_pricing_score := v_pricing_score + 15;
    ELSIF v_modalities_count >= 1 THEN
        v_pricing_score := v_pricing_score + 10;
    END IF;
    
    IF v_has_pricing THEN
        v_pricing_score := v_pricing_score + 15;
    END IF;
    
    -- === CALCULAR SCORE FINAL ===
    
    v_score := v_engagement_score + v_profile_score + v_pricing_score;
    
    -- Garantir que está entre 0 e 100
    IF v_score > 100 THEN
        v_score := 100;
    END IF;
    
    -- Determinar status
    v_details := jsonb_build_object(
        'score', v_score,
        'status', CASE
            WHEN v_score >= 80 THEN 'excellent'
            WHEN v_score >= 60 THEN 'good'
            WHEN v_score >= 40 THEN 'average'
            WHEN v_score >= 20 THEN 'at_risk'
            ELSE 'critical'
        END,
        'breakdown', jsonb_build_object(
            'engagement', v_engagement_score,
            'profile', v_profile_score,
            'pricing', v_pricing_score
        ),
        'metrics', jsonb_build_object(
            'total_checkins_30d', v_total_checkins,
            'avg_checkins_per_week', ROUND(v_avg_checkins_per_week, 1),
            'unique_users_30d', v_unique_users_last_30,
            'modalities_count', v_modalities_count,
            'profile_completeness', v_profile_completeness
        )
    );
    
    RETURN v_details::JSON;
END;
$$;

-- ============================================
-- 4. FUNÇÃO: Registrar evento
-- ============================================

CREATE OR REPLACE FUNCTION log_platform_event(
    p_user_id UUID,
    p_academy_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO platform_events (user_id, academy_id, event_type, event_data)
    VALUES (p_user_id, p_academy_id, p_event_type, p_event_data)
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- ============================================
-- 5. FUNÇÃO: Estatísticas globais (Admin)
-- ============================================

CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_total_academies INT;
    v_total_users INT;
    v_checkins_today INT;
    v_checkins_week INT;
    v_avg_health_score NUMERIC;
BEGIN
    -- Total de academias
    SELECT COUNT(*) INTO v_total_academies FROM academies;
    
    -- Total de usuários ativos (com pelo menos 1 check-in)
    SELECT COUNT(DISTINCT user_id) INTO v_total_users FROM checkins;
    
    -- Check-ins hoje
    SELECT COUNT(*) INTO v_checkins_today
    FROM checkins WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Check-ins últimos 7 dias
    SELECT COUNT(*) INTO v_checkins_week
    FROM checkins WHERE created_at >= NOW() - INTERVAL '7 days';
    
    -- Média de health score (simplificado - calcular para top 100 academias)
    SELECT AVG((calculate_academy_health_score(id)->>'score')::INT) INTO v_avg_health_score
    FROM (SELECT id FROM academies LIMIT 100) sub;
    
    v_result := json_build_object(
        'total_academies', v_total_academies,
        'total_active_users', v_total_users,
        'checkins_today', v_checkins_today,
        'checkins_last_7_days', v_checkins_week,
        'avg_health_score', ROUND(v_avg_health_score, 1)
    );
    
    RETURN v_result;
END;
$$;

-- ============================================
-- 6. CONCEDER PERMISSÕES
-- ============================================

GRANT ALL ON platform_events TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_academy_health_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_platform_event(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_stats() TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Teste com: 
-- SELECT calculate_academy_health_score('your-academy-uuid');
-- SELECT get_global_stats();
