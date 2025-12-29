-- ============================================
-- 🔔 SPRINT 10: COMPLEMENTOS - COMENTÁRIOS E RANKING
-- ============================================

-- ============================================
-- 1. FUNÇÃO: Adicionar comentário
-- ============================================

CREATE OR REPLACE FUNCTION add_comment_to_feed(
    p_feed_id UUID,
    p_user_id UUID,
    p_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comment_id UUID;
BEGIN
    INSERT INTO social_feed_comments (feed_id, user_id, comment)
    VALUES (p_feed_id, p_user_id, p_comment)
    RETURNING id INTO v_comment_id;
    
    UPDATE social_feed 
    SET comments_count = comments_count + 1 
    WHERE id = p_feed_id;
    
    RETURN v_comment_id;
END;
$$;

-- ============================================
-- 2. FUNÇÃO: Obter comentários de um post
-- ============================================

CREATE OR REPLACE FUNCTION get_feed_comments(
    p_feed_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    comment TEXT,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sfc.id,
        sfc.user_id,
        upp.username,
        upp.avatar_url,
        sfc.comment,
        sfc.created_at
    FROM social_feed_comments sfc
    JOIN user_profiles_public upp ON upp.user_id = sfc.user_id
    WHERE sfc.feed_id = p_feed_id
    ORDER BY sfc.created_at ASC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- 3. FUNÇÃO: Ranking de comunidade
-- ============================================

CREATE OR REPLACE FUNCTION get_community_ranking(
    p_community_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    posts_count BIGINT,
    likes_received BIGINT,
    rank INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        upp.user_id,
        upp.username,
        upp.avatar_url,
        COUNT(DISTINCT cp.id) as posts_count,
        COALESCE(SUM(cp.likes_count), 0) as likes_received,
        ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT cp.id) DESC, COALESCE(SUM(cp.likes_count), 0) DESC)::INT as rank
    FROM user_profiles_public upp
    JOIN community_posts cp ON cp.user_id = upp.user_id
    WHERE cp.community_id = p_community_id
    GROUP BY upp.user_id, upp.username, upp.avatar_url
    ORDER BY posts_count DESC, likes_received DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- 4. FUNÇÃO: Atualizar placar de desafio
-- ============================================

CREATE OR REPLACE FUNCTION update_challenge_score(
    p_challenge_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge pvp_challenges%ROWTYPE;
    v_challenger_score INT;
    v_opponent_score INT;
BEGIN
    SELECT * INTO v_challenge FROM pvp_challenges WHERE id = p_challenge_id;
    
    IF v_challenge.type = 'checkins' THEN
        -- Count checkins between start and end date
        SELECT COUNT(*) INTO v_challenger_score
        FROM checkins
        WHERE user_id = v_challenge.challenger_id
        AND DATE(created_at) BETWEEN v_challenge.start_date AND v_challenge.end_date;
        
        SELECT COUNT(*) INTO v_opponent_score
        FROM checkins
        WHERE user_id = v_challenge.opponent_id
        AND DATE(created_at) BETWEEN v_challenge.start_date AND v_challenge.end_date;
        
    ELSIF v_challenge.type = 'streak' THEN
        -- Get current streak
        SELECT current_streak INTO v_challenger_score
        FROM user_streaks
        WHERE user_id = v_challenge.challenger_id;
        
        SELECT current_streak INTO v_opponent_score
        FROM user_streaks
        WHERE user_id = v_challenge.opponent_id;
        
    ELSIF v_challenge.type = 'modalities' THEN
        -- Count distinct modalities
        SELECT COUNT(DISTINCT modality) INTO v_challenger_score
        FROM checkins
        WHERE user_id = v_challenge.challenger_id
        AND DATE(created_at) BETWEEN v_challenge.start_date AND v_challenge.end_date
        AND modality IS NOT NULL;
        
        SELECT COUNT(DISTINCT modality) INTO v_opponent_score
        FROM checkins
        WHERE user_id = v_challenge.opponent_id
        AND DATE(created_at) BETWEEN v_challenge.start_date AND v_challenge.end_date
        AND modality IS NOT NULL;
    END IF;
    
    -- Update scores
    UPDATE pvp_challenges
    SET 
        challenger_score = v_challenger_score,
        opponent_score = v_opponent_score,
        updated_at = NOW()
    WHERE id = p_challenge_id;
    
    -- Check if challenge ended
    IF CURRENT_DATE > v_challenge.end_date AND v_challenge.status = 'active' THEN
        UPDATE pvp_challenges
        SET 
            status = 'finished',
            winner_id = CASE 
                WHEN v_challenger_score > v_opponent_score THEN v_challenge.challenger_id
                WHEN v_opponent_score > v_challenger_score THEN v_challenge.opponent_id
                ELSE NULL
            END
        WHERE id = p_challenge_id;
    END IF;
END;
$$;

-- ============================================
-- 5. CONCEDER PERMISSÕES
-- ============================================

GRANT EXECUTE ON FUNCTION add_comment_to_feed(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feed_comments(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_ranking(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_challenge_score(UUID) TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Execute este SQL no Supabase para adicionar comentários e ranking
