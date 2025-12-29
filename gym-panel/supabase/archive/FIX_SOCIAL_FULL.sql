-- ============================================
-- 🚀 FIX SOCIAL & ONBOARDING FULL
-- ============================================
-- Execute este arquivo no Supabase SQL Editor para corrigir
-- todas as questões de comunidade, permissões e setup.

-- 1. GARANTE QUE A TABELA DE COMUNIDADES EXISTE E TEM DADOS
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modality TEXT UNIQUE NOT NULL,
    banner_url TEXT,
    description TEXT,
    members_count INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO communities (modality, description, banner_url) VALUES
('crossfit_box', 'Comunidade Global de CrossFit. WODs, PRs e superação.', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
('gym_standard', 'Musculação e Hipertrofia. Foco, técnica e disciplina.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
('studio', 'Studios, Yoga e Pilates. Equilíbrio, flexibilidade e paz.', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')
ON CONFLICT (modality) DO UPDATE 
SET description = EXCLUDED.description, banner_url = EXCLUDED.banner_url;

-- 2. GARANTE QUE A TABELA DE MEMBROS E POSTS EXISTEM
CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

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

-- 3. PERMISSÕES RLS (Crucial para o botão funcionar)
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Políticas para Membros
DROP POLICY IF EXISTS "Anyone can read members" ON community_members;
CREATE POLICY "Anyone can read members" ON community_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join communities" ON community_members;
CREATE POLICY "Users can join communities" ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
CREATE POLICY "Users can leave communities" ON community_members FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Posts
DROP POLICY IF EXISTS "Anyone can read posts" ON community_posts;
CREATE POLICY "Anyone can read posts" ON community_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Members can post" ON community_posts;
CREATE POLICY "Members can post" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. FUNÇÃO ONBOARDING (Garante que ela existe e lida com o evento)
CREATE OR REPLACE FUNCTION advance_user_onboarding(p_user_id UUID, p_event TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state RECORD;
    v_new_day INT;
    v_new_step TEXT;
    v_updated BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_state FROM user_onboarding_state WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Cria se não existir (Fallback)
        INSERT INTO user_onboarding_state (user_id) VALUES (p_user_id) RETURNING * INTO v_state;
    END IF;
    
    IF v_state.completed THEN
         RETURN jsonb_build_object('success', true, 'message', 'Already completed');
    END IF;

    -- LÓGICA DE TRANSIÇÃO
    -- DAY 1: Fazer check-in
    IF v_state.current_day = 1 AND p_event = 'checkin_completed' THEN
        v_new_day := 2; v_new_step := 'day_2_profile'; v_updated := TRUE;
    
    -- DAY 2: Completar perfil
    ELSIF v_state.current_day = 2 AND p_event = 'profile_updated' THEN
        v_new_day := 3; v_new_step := 'day_3_community'; v_updated := TRUE;
        
    -- DAY 3: Entrar em comunidade (O QUE O USUÁRIO QUER AGORA)
    ELSIF v_state.current_day = 3 AND p_event = 'joined_community' THEN
        v_new_day := 4; v_new_step := 'day_4_friend'; v_updated := TRUE;

    -- DAY 4: Seguir amigo
    ELSIF v_state.current_day = 4 AND p_event = 'friend_added' THEN
        v_new_day := 5; v_new_step := 'day_5_challenge'; v_updated := TRUE;
        
    -- DAY 5: Participar desafio
    ELSIF v_state.current_day = 5 AND p_event = 'challenge_joined' THEN
        v_new_day := 6; v_new_step := 'day_6_new_training'; v_updated := TRUE;
        
    -- DAY 6: Novo treino
    ELSIF v_state.current_day = 6 AND p_event = 'checkin_completed' THEN
        v_new_day := 7; v_new_step := 'day_7_stats'; v_updated := TRUE;
        
    -- DAY 7: Ver stats
    ELSIF v_state.current_day = 7 AND p_event = 'stats_viewed' THEN
        v_new_day := 7; v_new_step := 'completed'; v_updated := TRUE;
        UPDATE user_onboarding_state SET completed = TRUE, completed_at = NOW(), current_step = 'completed' WHERE user_id = p_user_id;
    END IF;
    
    IF v_updated THEN
        UPDATE user_onboarding_state
        SET current_day = v_new_day, current_step = v_new_step, last_update = NOW()
        WHERE user_id = p_user_id;
        RETURN jsonb_build_object('success', true, 'new_day', v_new_day);
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Event ignored');
    END IF;
END;
$$;

-- Permissões Finais
GRANT ALL ON communities TO authenticated;
GRANT ALL ON community_members TO authenticated;
GRANT ALL ON community_posts TO authenticated;
GRANT ALL ON user_onboarding_state TO authenticated;
GRANT EXECUTE ON FUNCTION advance_user_onboarding TO authenticated;
