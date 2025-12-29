-- ============================================
-- 🔴 SPRINT 11B: PRIVACIDADE + SEGURANÇA SOCIAL
-- ============================================

-- 1. TABELA: user_blocks (Bloqueios)
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- 2. TABELA: content_reports (Denúncias)
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL, -- user, post, comment, challenge
    target_id UUID NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'open', -- open, reviewing, resolved, ignored
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    admin_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);

-- 3. TABELA: user_privacy_settings (Configurações de Privacidade)
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_visibility TEXT DEFAULT 'public', -- public, friends_only, private
    allow_pvp_challenges TEXT DEFAULT 'everyone', -- everyone, followers_only, no_one
    allow_messages TEXT DEFAULT 'everyone', -- everyone, followers_only, no_one
    show_stats_details TEXT DEFAULT 'everyone', -- everyone, followers_only, only_me
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. FUNÇÃO: Obter ou criar settings ao acessar
CREATE OR REPLACE FUNCTION get_user_privacy_settings(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings RECORD;
BEGIN
    SELECT * INTO v_settings FROM user_privacy_settings WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_privacy_settings (user_id) VALUES (p_user_id)
        RETURNING * INTO v_settings;
    END IF;

    RETURN to_jsonb(v_settings);
END;
$$;

-- 5. FUNÇÃO: Verificar se pode ver perfil (respeitando bloqueios e privacidade)
CREATE OR REPLACE FUNCTION can_view_profile(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_visibility TEXT;
    v_is_following BOOLEAN;
    v_is_blocked BOOLEAN;
BEGIN
    -- Se for o próprio usuário, sempre pode
    IF viewer_id = target_id THEN
        RETURN TRUE;
    END IF;

    -- 1. Checar bloqueio (nos dois sentidos)
    IF EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE (blocker_id = viewer_id AND blocked_id = target_id)
           OR (blocker_id = target_id AND blocked_id = viewer_id)
    ) THEN
        RETURN FALSE;
    END IF;

    -- 2. Checar visibilidade
    SELECT profile_visibility INTO v_visibility 
    FROM user_privacy_settings 
    WHERE user_id = target_id;
    
    -- Se não tiver settings (null), assume public
    IF v_visibility IS NULL OR v_visibility = 'public' THEN
        RETURN TRUE;
    END IF;

    IF v_visibility = 'private' THEN
        RETURN FALSE;
    END IF;

    IF v_visibility = 'friends_only' THEN
        -- Verifica se segue (follower)
        SELECT EXISTS (
            SELECT 1 FROM social_follows 
            WHERE follower_id = viewer_id AND following_id = target_id
        ) INTO v_is_following;
        
        RETURN v_is_following;
    END IF;

    RETURN TRUE;
END;
$$;

-- 6. ATUALIZAR FUNÇÃO DE FEED PARA FILTRAR BLOQUEADOS
-- (Esta é uma função auxiliar para ser usada nas queries do app)
CREATE OR REPLACE FUNCTION get_blocked_user_ids(p_user_id UUID)
RETURNS TABLE (blocked_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT blocked_id FROM user_blocks WHERE blocker_id = p_user_id
    UNION
    SELECT blocker_id FROM user_blocks WHERE blocked_id = p_user_id;
END;
$$;

-- 7. FUNÇÃO: Bloquear Usuário
CREATE OR REPLACE FUNCTION block_user(p_blocker_id UUID, p_blocked_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_blocks (blocker_id, blocked_id)
    VALUES (p_blocker_id, p_blocked_id)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
    
    -- Opcional: Remover follow mútuo ao bloquear
    DELETE FROM social_follows WHERE follower_id = p_blocker_id AND following_id = p_blocked_id;
    DELETE FROM social_follows WHERE follower_id = p_blocked_id AND following_id = p_blocker_id;
END;
$$;

-- 8. FUNÇÃO: Atualizar Settings
CREATE OR REPLACE FUNCTION update_privacy_settings(
    p_user_id UUID,
    p_profile_visibility TEXT DEFAULT NULL,
    p_allow_pvp TEXT DEFAULT NULL,
    p_show_stats TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated JSONB;
BEGIN
    UPDATE user_privacy_settings
    SET 
        profile_visibility = COALESCE(p_profile_visibility, profile_visibility),
        allow_pvp_challenges = COALESCE(p_allow_pvp, allow_pvp_challenges),
        show_stats_details = COALESCE(p_show_stats, show_stats_details),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING to_jsonb(user_privacy_settings.*) INTO v_updated;

    IF NOT FOUND THEN
        INSERT INTO user_privacy_settings (
            user_id, profile_visibility, allow_pvp_challenges, show_stats_details
        ) VALUES (
            p_user_id,
            COALESCE(p_profile_visibility, 'public'),
            COALESCE(p_allow_pvp, 'everyone'),
            COALESCE(p_show_stats, 'everyone')
        )
        RETURNING to_jsonb(user_privacy_settings.*) INTO v_updated;
    END IF;

    RETURN v_updated;
END;
$$;


-- PERMISSÕES
GRANT ALL ON user_blocks TO authenticated;
GRANT ALL ON content_reports TO authenticated;
GRANT ALL ON user_privacy_settings TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_privacy_settings TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_user_ids TO authenticated;
GRANT EXECUTE ON FUNCTION block_user TO authenticated;
GRANT EXECUTE ON FUNCTION update_privacy_settings TO authenticated;
