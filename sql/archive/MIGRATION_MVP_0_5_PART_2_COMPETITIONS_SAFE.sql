-- ============================================================================
-- MIGRATION: MVP 0.5 - PART 2: COMPETIÇÕES (VERSÃO SAFE)
-- Descrição: Sistema de competições entre alunos com ranking em tempo real
-- Autor: Antigravity (Senior Developer)
-- Data: 2025-11-24
-- Versão: 0.5.2 (Safe - não dá erro se já existir)
-- ============================================================================

-- ============================================================================
-- STEP 1: CRIAR TABELA DE COMPETIÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL CHECK (LENGTH(name) >= 3 AND LENGTH(name) <= 100),
    description TEXT,
    
    modality_filter TEXT CHECK (modality_filter IN ('gym_standard', 'crossfit_box', 'studio', 'all')),
    scoring_rule TEXT DEFAULT 'total_checkins' CHECK (scoring_rule IN ('total_checkins', 'streak_days', 'unique_academies')),
    
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL CHECK (end_date > start_date),
    
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
    
    is_public BOOLEAN DEFAULT false,
    max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
    
    prize_description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (start_date >= created_at)
);

-- Índices com verificação
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitions_creator') THEN
        CREATE INDEX idx_competitions_creator ON competitions(creator_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitions_status') THEN
        CREATE INDEX idx_competitions_status ON competitions(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitions_dates') THEN
        CREATE INDEX idx_competitions_dates ON competitions(start_date, end_date);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitions_active') THEN
        CREATE INDEX idx_competitions_active ON competitions(status, end_date) WHERE status = 'active';
    END IF;
END $$;

-- Trigger
CREATE OR REPLACE FUNCTION update_competitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_competitions_updated_at ON competitions;
CREATE TRIGGER trigger_competitions_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW
    EXECUTE FUNCTION update_competitions_updated_at();

-- ============================================================================
-- STEP 2: CRIAR TABELA DE PARTICIPANTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS competition_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
    invited_by UUID REFERENCES auth.users(id),
    
    score INTEGER DEFAULT 0 CHECK (score >= 0),
    rank INTEGER,
    
    total_checkins INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    unique_academies INTEGER DEFAULT 0,
    last_checkin_date DATE,
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_score_update TIMESTAMPTZ,
    
    UNIQUE(competition_id, user_id)
);

-- Índices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_comp_participants_competition') THEN
        CREATE INDEX idx_comp_participants_competition ON competition_participants(competition_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_comp_participants_user') THEN
        CREATE INDEX idx_comp_participants_user ON competition_participants(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_comp_participants_status') THEN
        CREATE INDEX idx_comp_participants_status ON competition_participants(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_comp_participants_ranking') THEN
        CREATE INDEX idx_comp_participants_ranking ON competition_participants(competition_id, rank) WHERE status = 'accepted';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: FUNÇÃO - ATUALIZAR PONTUAÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION update_participant_score(
    p_competition_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_competition RECORD;
    v_new_score INTEGER;
    v_checkins_count INTEGER;
    v_streak INTEGER;
    v_unique_academies INTEGER;
BEGIN
    SELECT * INTO v_competition
    FROM competitions
    WHERE id = p_competition_id;

    IF v_competition IS NULL OR v_competition.status != 'active' THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_checkins_count
    FROM checkins c
    LEFT JOIN memberships m ON m.user_id = c.user_id AND m.status = 'active'
    LEFT JOIN modality_plans mp ON mp.id = m.modality_plan_id
    WHERE c.user_id = p_user_id
      AND c.created_at >= v_competition.start_date
      AND c.created_at <= v_competition.end_date
      AND (
          v_competition.modality_filter = 'all'
          OR mp.modality_type = v_competition.modality_filter
      );

    SELECT COUNT(DISTINCT c.academy_id) INTO v_unique_academies
    FROM checkins c
    LEFT JOIN memberships m ON m.user_id = c.user_id AND m.status = 'active'
    LEFT JOIN modality_plans mp ON mp.id = m.modality_plan_id
    WHERE c.user_id = p_user_id
      AND c.created_at >= v_competition.start_date
      AND c.created_at <= v_competition.end_date
      AND (
          v_competition.modality_filter = 'all'
          OR mp.modality_type = v_competition.modality_filter
      );

    WITH daily_checkins AS (
        SELECT DISTINCT DATE(c.created_at) as checkin_date
        FROM checkins c
        LEFT JOIN memberships m ON m.user_id = c.user_id AND m.status = 'active'
        LEFT JOIN modality_plans mp ON mp.id = m.modality_plan_id
        WHERE c.user_id = p_user_id
          AND c.created_at >= v_competition.start_date
          AND c.created_at <= v_competition.end_date
          AND (
              v_competition.modality_filter = 'all'
              OR mp.modality_type = v_competition.modality_filter
          )
        ORDER BY checkin_date DESC
    ),
    streaks AS (
        SELECT 
            checkin_date,
            checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date))::INTEGER as streak_group
        FROM daily_checkins
    )
    SELECT COALESCE(MAX(COUNT(*)), 0) INTO v_streak
    FROM streaks
    GROUP BY streak_group;

    CASE v_competition.scoring_rule
        WHEN 'total_checkins' THEN
            v_new_score := v_checkins_count;
        WHEN 'streak_days' THEN
            v_new_score := v_streak;
        WHEN 'unique_academies' THEN
            v_new_score := v_unique_academies;
        ELSE
            v_new_score := v_checkins_count;
    END CASE;

    UPDATE competition_participants
    SET 
        score = v_new_score,
        total_checkins = v_checkins_count,
        current_streak = v_streak,
        max_streak = GREATEST(max_streak, v_streak),
        unique_academies = v_unique_academies,
        last_score_update = NOW()
    WHERE competition_id = p_competition_id
      AND user_id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: FUNÇÃO - ATUALIZAR RANKING
-- ============================================================================

CREATE OR REPLACE FUNCTION update_competition_rankings(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
    WITH ranked AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                ORDER BY score DESC, total_checkins DESC, joined_at ASC
            ) as new_rank
        FROM competition_participants
        WHERE competition_id = p_competition_id
          AND status = 'accepted'
    )
    UPDATE competition_participants cp
    SET rank = ranked.new_rank
    FROM ranked
    WHERE cp.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: FUNÇÃO - AUTO-ENCERRAR COMPETIÇÕES
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_end_competitions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE competitions
        SET status = 'ended'
        WHERE status = 'active'
          AND end_date < NOW()
        RETURNING *
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: TRIGGER - ATUALIZAR SCORES EM CHECK-IN
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_competition_scores()
RETURNS TRIGGER AS $$
DECLARE
    v_competition RECORD;
BEGIN
    FOR v_competition IN
        SELECT DISTINCT c.id
        FROM competitions c
        JOIN competition_participants cp ON cp.competition_id = c.id
        WHERE cp.user_id = NEW.user_id
          AND cp.status = 'accepted'
          AND c.status = 'active'
          AND NEW.created_at >= c.start_date
          AND NEW.created_at <= c.end_date
    LOOP
        PERFORM update_participant_score(v_competition.id, NEW.user_id);
        PERFORM update_competition_rankings(v_competition.id);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_checkin_update_competitions ON checkins;
CREATE TRIGGER trigger_checkin_update_competitions
    AFTER INSERT ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_competition_scores();

-- ============================================================================
-- STEP 7: VIEW - LEADERBOARD
-- ============================================================================

CREATE OR REPLACE VIEW competition_leaderboard AS
SELECT 
    cp.competition_id,
    cp.user_id,
    u.full_name as user_name,
    u.email as user_email,
    cp.rank,
    cp.score,
    cp.total_checkins,
    cp.current_streak,
    cp.max_streak,
    cp.unique_academies,
    cp.status as participant_status,
    c.name as competition_name,
    c.scoring_rule,
    c.status as competition_status,
    c.start_date,
    c.end_date
FROM competition_participants cp
JOIN competitions c ON c.id = cp.competition_id
JOIN users u ON u.id = cp.user_id
WHERE cp.status = 'accepted'
ORDER BY cp.competition_id, cp.rank;

-- ============================================================================
-- STEP 8: RLS POLICIES
-- ============================================================================

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem
DROP POLICY IF EXISTS "Usuários veem competições públicas ou próprias" ON competitions;
DROP POLICY IF EXISTS "Criador pode editar competição" ON competitions;
DROP POLICY IF EXISTS "Criador pode deletar competição" ON competitions;
DROP POLICY IF EXISTS "Usuários podem criar competições" ON competitions;
DROP POLICY IF EXISTS "Usuários veem participantes de competições acessíveis" ON competition_participants;
DROP POLICY IF EXISTS "Criador pode adicionar participantes" ON competition_participants;
DROP POLICY IF EXISTS "Participante pode atualizar próprio status" ON competition_participants;

-- Recriar policies
CREATE POLICY "Usuários veem competições públicas ou próprias"
ON competitions FOR SELECT
TO authenticated
USING (
    is_public = true
    OR creator_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM competition_participants
        WHERE competition_id = competitions.id
          AND user_id = auth.uid()
    )
);

CREATE POLICY "Criador pode editar competição"
ON competitions FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Criador pode deletar competição"
ON competitions FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Usuários podem criar competições"
ON competitions FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Usuários veem participantes de competições acessíveis"
ON competition_participants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM competitions c
        WHERE c.id = competition_participants.competition_id
          AND (
              c.is_public = true
              OR c.creator_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM competition_participants cp2
                  WHERE cp2.competition_id = c.id
                    AND cp2.user_id = auth.uid()
              )
          )
    )
);

CREATE POLICY "Criador pode adicionar participantes"
ON competition_participants FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM competitions
        WHERE id = competition_participants.competition_id
          AND creator_id = auth.uid()
    )
);

CREATE POLICY "Participante pode atualizar próprio status"
ON competition_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migração PART 2 concluída com sucesso!';
    RAISE NOTICE '📊 Tabelas: competitions, competition_participants';
    RAISE NOTICE '⚡ Funções: 4';
    RAISE NOTICE '🔄 Trigger: trigger_checkin_update_competitions';
    RAISE NOTICE '👁️ View: competition_leaderboard';
END $$;
