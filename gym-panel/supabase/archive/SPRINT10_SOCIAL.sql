-- ============================================
-- 🏃 SPRINT 10: SOCIAL FITNESS
-- ============================================
-- Copie e cole este arquivo COMPLETO no Supabase SQL Editor

-- ============================================
-- 1. TABELA: user_profiles_public (Perfis Públicos)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles_public (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    visibility TEXT DEFAULT 'public', -- 'public', 'friends_only', 'private'
    athlete_level INT DEFAULT 1,
    total_checkins INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles_public(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles_public(user_id);

-- ============================================
-- 2. TABELA: social_feed (Feed de Atividades)
-- ============================================

CREATE TABLE IF NOT EXISTS social_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'checkin', 'badge', 'streak', 'challenge', 'mission'
    message TEXT,
    photo_url TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_feed_user_id ON social_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_social_feed_created_at ON social_feed(created_at);

-- ============================================
-- 3. TABELA: social_feed_likes (Curtidas)
-- ============================================

CREATE TABLE IF NOT EXISTS social_feed_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID REFERENCES social_feed(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(feed_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_feed_likes_feed_id ON social_feed_likes(feed_id);

-- ============================================
-- 4. TABELA: social_feed_comments (Comentários)
-- ============================================

CREATE TABLE IF NOT EXISTS social_feed_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID REFERENCES social_feed(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_feed_comments_feed_id ON social_feed_comments(feed_id);

-- ============================================
-- 5. TABELA: user_follows (Seguidores)
-- ============================================

CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- ============================================
-- 6. TABELA: pvp_challenges (Desafios PVP)
-- ============================================

CREATE TABLE IF NOT EXISTS pvp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'finished', 'declined'
    type TEXT NOT NULL, -- 'streak', 'checkins', 'modalities', 'monthly'
    start_date DATE,
    end_date DATE,
    challenger_score INT DEFAULT 0,
    opponent_score INT DEFAULT 0,
    winner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pvp_challenges_challenger ON pvp_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_pvp_challenges_opponent ON pvp_challenges(opponent_id);
CREATE INDEX IF NOT EXISTS idx_pvp_challenges_status ON pvp_challenges(status);

-- ============================================
-- 7. TABELA: communities (Comunidades por Modalidade)
-- ============================================

CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modality TEXT UNIQUE NOT NULL,
    banner_url TEXT,
    description TEXT,
    members_count INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir comunidades padrão
INSERT INTO communities (modality, description) VALUES
('Cross', 'Comunidade de CrossFit'),
('Funcional', 'Treino Funcional'),
('Yoga', 'Yoga e Meditação'),
('Muay Thai', 'Artes Marciais'),
('Pilates', 'Pilates e Alongamento'),
('Musculação', 'Musculação e Hipertrofia'),
('Bike Indoor', 'Spinning e Ciclismo')
ON CONFLICT (modality) DO NOTHING;

-- ============================================
-- 8. TABELA: community_members (Membros das Comunidades)
-- ============================================

CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);

-- ============================================
-- 9. TABELA: community_posts (Posts das Comunidades)
-- ============================================

CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    photo_url TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_community ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at);

-- ============================================
-- 10. FUNÇÃO: Criar perfil público automático
-- ============================================

CREATE OR REPLACE FUNCTION create_public_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_profiles_public (user_id, username)
    VALUES (NEW.id, LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger para criar perfil automático
DROP TRIGGER IF EXISTS create_public_profile_trigger ON auth.users;
CREATE TRIGGER create_public_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_public_profile();

-- ============================================
-- 11. FUNÇÃO: Obter feed social
-- ============================================

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
    WHERE sf.user_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = p_user_id
        UNION
        SELECT p_user_id
    )
    ORDER BY sf.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- 12. FUNÇÃO: Seguir usuário
-- ============================================

CREATE OR REPLACE FUNCTION follow_user(
    p_follower_id UUID,
    p_following_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_follows (follower_id, following_id)
    VALUES (p_follower_id, p_following_id)
    ON CONFLICT DO NOTHING;
    
    -- Atualizar contadores
    UPDATE user_profiles_public 
    SET following = following + 1 
    WHERE user_id = p_follower_id;
    
    UPDATE user_profiles_public 
    SET followers = followers + 1 
    WHERE user_id = p_following_id;
END;
$$;

-- ============================================
-- 13. FUNÇÃO: Deixar de seguir
-- ============================================

CREATE OR REPLACE FUNCTION unfollow_user(
    p_follower_id UUID,
    p_following_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_follows 
    WHERE follower_id = p_follower_id AND following_id = p_following_id;
    
    -- Atualizar contadores
    UPDATE user_profiles_public 
    SET following = GREATEST(following - 1, 0)
    WHERE user_id = p_follower_id;
    
    UPDATE user_profiles_public 
    SET followers = GREATEST(followers - 1, 0)
    WHERE user_id = p_following_id;
END;
$$;

-- ============================================
-- 14. FUNÇÃO: Curtir post
-- ============================================

CREATE OR REPLACE FUNCTION like_feed_post(
    p_feed_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO social_feed_likes (feed_id, user_id)
    VALUES (p_feed_id, p_user_id)
    ON CONFLICT DO NOTHING;
    
    UPDATE social_feed 
    SET likes_count = likes_count + 1 
    WHERE id = p_feed_id;
END;
$$;

-- ============================================
-- 15. FUNÇÃO: Descurtir post
-- ============================================

CREATE OR REPLACE FUNCTION unlike_feed_post(
    p_feed_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM social_feed_likes 
    WHERE feed_id = p_feed_id AND user_id = p_user_id;
    
    UPDATE social_feed 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = p_feed_id;
END;
$$;

-- ============================================
-- 16. FUNÇÃO: Estatísticas avançadas do usuário
-- ============================================

CREATE OR REPLACE FUNCTION get_user_stats_advanced(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_checkins', COUNT(*),
        'favorite_academy', (
            SELECT a.name 
            FROM academies a
            JOIN checkins c ON c.academy_id = a.id
            WHERE c.user_id = p_user_id
            GROUP BY a.id, a.name
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),
        'favorite_modality', (
            SELECT modality
            FROM checkins
            WHERE user_id = p_user_id AND modality IS NOT NULL
            GROUP BY modality
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),
        'checkins_by_hour', (
            SELECT jsonb_object_agg(hour, count)
            FROM (
                SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
                FROM checkins
                WHERE user_id = p_user_id
                GROUP BY hour
                ORDER BY hour
            ) sub
        ),
        'checkins_by_weekday', (
            SELECT jsonb_object_agg(weekday, count)
            FROM (
                SELECT TO_CHAR(created_at, 'Day') as weekday, COUNT(*) as count
                FROM checkins
                WHERE user_id = p_user_id
                GROUP BY weekday
                ORDER BY MIN(EXTRACT(DOW FROM created_at))
            ) sub
        )
    ) INTO v_stats
    FROM checkins
    WHERE user_id = p_user_id;
    
    RETURN v_stats;
END;
$$;

-- ============================================
-- 17. CONCEDER PERMISSÕES
-- ============================================

GRANT ALL ON user_profiles_public TO authenticated;
GRANT ALL ON social_feed TO authenticated;
GRANT ALL ON social_feed_likes TO authenticated;
GRANT ALL ON social_feed_comments TO authenticated;
GRANT ALL ON user_follows TO authenticated;
GRANT ALL ON pvp_challenges TO authenticated;
GRANT ALL ON communities TO authenticated;
GRANT ALL ON community_members TO authenticated;
GRANT ALL ON community_posts TO authenticated;

GRANT EXECUTE ON FUNCTION get_social_feed(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION follow_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unfollow_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION like_feed_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unlike_feed_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_advanced(UUID) TO authenticated;

-- ============================================
-- ✅ PRONTO!
-- ============================================
-- Execute este SQL no Supabase para criar toda a estrutura social
