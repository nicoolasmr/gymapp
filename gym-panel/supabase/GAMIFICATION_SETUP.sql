-- ============================================
-- 🚀 SPRINT 5: ENGAJAMENTO + GAMIFICAÇÃO
-- ============================================
-- Copie e cole este arquivo COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. CRIAR TABELA user_engagement
-- ============================================

CREATE TABLE IF NOT EXISTS user_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_checkin DATE,
    total_checkins INT DEFAULT 0,
    badges JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_current_streak ON user_engagement(current_streak DESC);

-- ============================================
-- 2. FUNÇÃO: Atualizar engajamento no check-in
-- ============================================

CREATE OR REPLACE FUNCTION update_user_engagement_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_checkin DATE;
    v_current_streak INT;
    v_longest_streak INT;
    v_total_checkins INT;
    v_new_streak INT;
BEGIN
    -- Buscar dados atuais do usuário
    SELECT last_checkin, current_streak, longest_streak, total_checkins
    INTO v_last_checkin, v_current_streak, v_longest_streak, v_total_checkins
    FROM user_engagement
    WHERE user_id = NEW.user_id;
    
    -- Se não existe registro, criar
    IF NOT FOUND THEN
        INSERT INTO user_engagement (user_id, current_streak, longest_streak, last_checkin, total_checkins)
        VALUES (NEW.user_id, 1, 1, CURRENT_DATE, 1);
        RETURN NEW;
    END IF;
    
    -- Calcular novo streak
    IF v_last_checkin = CURRENT_DATE THEN
        -- Check-in já feito hoje, não altera streak
        v_new_streak := v_current_streak;
    ELSIF v_last_checkin = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Check-in foi ontem, incrementa streak
        v_new_streak := v_current_streak + 1;
    ELSE
        -- Quebrou o streak, reinicia
        v_new_streak := 1;
    END IF;
    
    -- Atualizar longest_streak se necessário
    IF v_new_streak > v_longest_streak THEN
        v_longest_streak := v_new_streak;
    END IF;
    
    -- Atualizar registro
    UPDATE user_engagement
    SET 
        current_streak = v_new_streak,
        longest_streak = v_longest_streak,
        last_checkin = CURRENT_DATE,
        total_checkins = v_total_checkins + 1,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- 3. CRIAR TRIGGER no check-in
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_engagement_on_checkin ON checkins;

CREATE TRIGGER trigger_update_engagement_on_checkin
AFTER INSERT ON checkins
FOR EACH ROW
EXECUTE FUNCTION update_user_engagement_on_checkin();

-- ============================================
-- 4. FUNÇÃO: Adicionar badge ao usuário
-- ============================================

CREATE OR REPLACE FUNCTION add_badge_to_user(
    p_user_id UUID,
    p_badge_id TEXT,
    p_badge_name TEXT,
    p_badge_icon TEXT,
    p_badge_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_badges JSONB;
    v_badge_exists BOOLEAN;
BEGIN
    -- Buscar badges atuais
    SELECT badges INTO v_badges
    FROM user_engagement
    WHERE user_id = p_user_id;
    
    -- Verificar se badge já existe
    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_badges) AS badge
        WHERE badge->>'id' = p_badge_id
    ) INTO v_badge_exists;
    
    -- Se já existe, retornar false
    IF v_badge_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Adicionar nova badge
    UPDATE user_engagement
    SET 
        badges = badges || jsonb_build_object(
            'id', p_badge_id,
            'name', p_badge_name,
            'icon', p_badge_icon,
            'description', p_badge_description,
            'unlocked_at', NOW()
        )::JSONB,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- ============================================
-- 5. FUNÇÃO: Buscar progresso do usuário
-- ============================================

CREATE OR REPLACE FUNCTION get_user_progress(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_engagement RECORD;
    v_checkins_last_7_days JSON;
BEGIN
    -- Buscar dados de engajamento
    SELECT * INTO v_engagement
    FROM user_engagement
    WHERE user_id = p_user_id;
    
    -- Se não existe, criar registro inicial
    IF NOT FOUND THEN
        INSERT INTO user_engagement (user_id)
        VALUES (p_user_id)
        RETURNING * INTO v_engagement;
    END IF;
    
    -- Buscar check-ins dos últimos 7 dias
    SELECT json_agg(
        json_build_object(
            'date', day::DATE,
            'count', COALESCE(checkin_count, 0)
        )
        ORDER BY day
    ) INTO v_checkins_last_7_days
    FROM (
        SELECT generate_series(
            DATE_TRUNC('day', NOW() - INTERVAL '6 days'),
            DATE_TRUNC('day', NOW()),
            '1 day'::INTERVAL
        ) AS day
    ) days
    LEFT JOIN (
        SELECT DATE_TRUNC('day', created_at) AS checkin_day, COUNT(*) AS checkin_count
        FROM checkins
        WHERE user_id = p_user_id
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', created_at)
    ) checkins_data ON days.day = checkins_data.checkin_day;
    
    -- Construir resultado
    v_result := json_build_object(
        'current_streak', v_engagement.current_streak,
        'longest_streak', v_engagement.longest_streak,
        'total_checkins', v_engagement.total_checkins,
        'last_checkin', v_engagement.last_checkin,
        'badges', v_engagement.badges,
        'checkins_last_7_days', v_checkins_last_7_days
    );
    
    RETURN v_result;
END;
$$;

-- ============================================
-- 6. CONCEDER PERMISSÕES
-- ============================================

GRANT ALL ON user_engagement TO authenticated;
GRANT EXECUTE ON FUNCTION add_badge_to_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_progress(UUID) TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Teste com: SELECT get_user_progress('your-user-uuid');
