-- ============================================
-- 🛡️ SPRINT 10 FIXES & DASHBOARDS (Validation & Security)
-- ============================================

-- 1. SECURE FEED: Update get_social_feed to respect user_blocks
CREATE OR REPLACE FUNCTION get_social_feed(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    event_type TEXT,
    message TEXT,
    photo_url TEXT,
    likes_count INT,
    comments_count INT,
    created_at TIMESTAMP,
    is_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sf.id,
        sf.user_id,
        upp.username,
        upp.avatar_url,
        sf.event_type,
        sf.message,
        sf.photo_url,
        sf.likes_count,
        sf.comments_count,
        sf.created_at,
        EXISTS(
            SELECT 1 FROM social_feed_likes sfl 
            WHERE sfl.feed_id = sf.id AND sfl.user_id = p_user_id
        ) as is_liked
    FROM social_feed sf
    JOIN user_profiles_public upp ON upp.user_id = sf.user_id
    WHERE 
        -- Filter 1: Following or Self
        sf.user_id IN (
            SELECT following_id FROM user_follows WHERE follower_id = p_user_id
            UNION
            SELECT p_user_id
        )
        -- Filter 2: NOT BLOCKED (Security Fix)
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks ub 
            WHERE (ub.blocker_id = p_user_id AND ub.blocked_id = sf.user_id)
               OR (ub.blocker_id = sf.user_id AND ub.blocked_id = p_user_id)
        )
    ORDER BY sf.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 2. ACADEMY OWNER SOCIAL DASHBOARD (New Requirement)
CREATE OR REPLACE FUNCTION get_academy_social_metrics(p_academy_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_social_users INT;
    v_total_posts_today INT;
    v_total_comments_today INT;
    v_top_engagers JSONB;
    v_trending_posts JSONB;
BEGIN
    -- A) Active Social Users (Users who checked in at this academy and posted/interacted recently)
    SELECT COUNT(DISTINCT sf.user_id) INTO v_active_social_users
    FROM social_feed sf
    JOIN checkins c ON c.id = sf.checkin_id
    WHERE c.academy_id = p_academy_id
      AND sf.created_at > NOW() - INTERVAL '30 days';

    -- B) Engagement Today
    -- Logic: Count posts linked to checkins at this academy
    SELECT COUNT(*) INTO v_total_posts_today
    FROM social_feed sf
    JOIN checkins c ON c.id = sf.checkin_id
    WHERE c.academy_id = p_academy_id
      AND sf.created_at >= CURRENT_DATE;

    -- C) Top Engagers (Students of this academy)
    SELECT jsonb_agg(sub) INTO v_top_engagers
    FROM (
        SELECT upp.username, upp.avatar_url, COUNT(*) as interaction_count
        FROM social_feed sf
        JOIN checkins c ON c.id = sf.checkin_id
        JOIN user_profiles_public upp ON upp.user_id = sf.user_id
        WHERE c.academy_id = p_academy_id
          AND sf.created_at > NOW() - INTERVAL '7 days'
        GROUP BY upp.username, upp.avatar_url
        ORDER BY interaction_count DESC
        LIMIT 5
    ) sub;

    -- D) Recent Academy Posts
    SELECT jsonb_agg(sub) INTO v_trending_posts
    FROM (
        SELECT sf.message, sf.likes_count, sf.created_at, upp.username
        FROM social_feed sf
        JOIN checkins c ON c.id = sf.checkin_id
        JOIN user_profiles_public upp ON upp.user_id = sf.user_id
        WHERE c.academy_id = p_academy_id
        ORDER BY sf.created_at DESC
        LIMIT 5
    ) sub;

    RETURN jsonb_build_object(
        'active_social_users_30d', v_active_social_users,
        'posts_today', v_total_posts_today,
        'comments_today', 0, -- Placeholder, would need complex join on checkins -> feed -> comments
        'top_engagers', COALESCE(v_top_engagers, '[]'::jsonb),
        'recent_posts', COALESCE(v_trending_posts, '[]'::jsonb),
        'insights', jsonb_build_array(
            CASE WHEN v_active_social_users > 10 THEN 'Sua comunidade está ativa!' ELSE 'Incentive seus alunos a postarem check-ins.' END
        )
    );
END;
$$;

-- 3. GLOBAL ADMIN SOCIAL VIEW (New Requirement)
CREATE OR REPLACE FUNCTION get_global_social_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_posts_last_hour INT;
    v_total_comments INT;
    v_total_challenges INT;
    v_most_active_modality TEXT;
    v_suspicious_users JSONB;
BEGIN
    -- Posts Last Hour
    SELECT COUNT(*) INTO v_posts_last_hour FROM social_feed WHERE created_at > NOW() - INTERVAL '1 hour';

    -- Comments Last 24h
    SELECT COUNT(*) INTO v_total_comments FROM social_feed_comments WHERE created_at > NOW() - INTERVAL '24 hours';

    -- Challenges Created Last 24h
    SELECT COUNT(*) INTO v_total_challenges FROM pvp_challenges WHERE created_at > NOW() - INTERVAL '24 hours';

    -- Most Active Community/Modality
    SELECT modality INTO v_most_active_modality
    FROM communities
    ORDER BY posts_count DESC
    LIMIT 1;

    -- Suspicious Users (e.g., > 50 posts in 24h)
    SELECT jsonb_agg(sub) INTO v_suspicious_users
    FROM (
        SELECT user_id, COUNT(*) as post_count
        FROM social_feed
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY user_id
        HAVING COUNT(*) > 50
    ) sub;

    RETURN jsonb_build_object(
        'posts_last_hour', v_posts_last_hour,
        'comments_24h', v_total_comments,
        'challenges_24h', v_total_challenges,
        'trending_modality', v_most_active_modality,
        'potential_spam', COALESCE(v_suspicious_users, '[]'::jsonb)
    );
END;
$$;

-- Grant Permissions
GRANT EXECUTE ON FUNCTION get_academy_social_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_social_overview() TO authenticated;

