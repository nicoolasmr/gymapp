-- ============================================================================
-- MIGRATION: MVP 0.5 - PART 2: COMPETIÇÕES (GYMRATS-LIKE)
-- Descrição: Sistema de competições entre alunos com ranking em tempo real
-- Autor: Antigravity (Senior Developer)
-- Data: 2025-11-24
-- Versão: 0.5.2
-- ============================================================================

-- ============================================================================
-- STEP 1: CRIAR TABELA DE COMPETIÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Criador
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informações básicas
    name TEXT NOT NULL CHECK (LENGTH(name) >= 3 AND LENGTH(name) <= 100),
    description TEXT,
    
    -- Filtros e regras
    modality_filter TEXT CHECK (modality_filter IN ('gym_standard', 'crossfit_box', 'studio', 'all')),
    scoring_rule TEXT DEFAULT 'total_checkins' CHECK (scoring_rule IN ('total_checkins', 'streak_days', 'unique_academies')),
    
    -- Período
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL CHECK (end_date > start_date),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
    
    -- Visibilidade
    is_public BOOLEAN DEFAULT false,
    max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
    
    -- Prêmio (opcional)
    prize_description TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (start_date >= created_at)
);

-- Índices
CREATE INDEX idx_competitions_creator ON competitions(creator_id);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_dates ON competitions(start_date, end_date);
CREATE INDEX idx_competitions_active ON competitions(status, end_date) 
    WHERE status = 'active';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_competitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_competitions_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW
    EXECUTE FUNCTION update_competitions_updated_at();

COMMENT ON TABLE competitions IS 'Competições entre alunos estilo Gymrats';
COMMENT ON COLUMN competitions.scoring_rule IS 'Regra de pontuação: total_checkins, streak_days, unique_academies';
COMMENT ON COLUMN competitions.modality_filter IS 'Filtro de modalidade ou all para qualquer';

-- ============================================================================
-- STEP 2: CRIAR TABELA DE PARTICIPANTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS competition_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status do convite
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
    invited_by UUID REFERENCES auth.users(id),
    
    -- Pontuação
    score INTEGER DEFAULT 0 CHECK (score >= 0),
    rank INTEGER,
    
    -- Estatísticas
    total_checkins INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    unique_academies INTEGER DEFAULT 0,
    last_checkin_date DATE,
    
    -- Metadata
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_score_update TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(competition_id, user_id)
);

-- Índices
CREATE INDEX idx_comp_participants_competition ON competition_participants(competition_id);
CREATE INDEX idx_comp_participants_user ON competition_participants(user_id);
CREATE INDEX idx_comp_participants_status ON competition_participants(status);
CREATE INDEX idx_comp_participants_ranking ON competition_participants(competition_id, rank) 
    WHERE status = 'accepted';

COMMENT ON TABLE competition_participants IS 'Participantes de competições com pontuação e ranking';
COMMENT ON COLUMN competition_participants.score IS 'Pontuação calculada baseada na scoring_rule';

-- ============================================================================
-- STEP 3: FUNÇÃO - ATUALIZAR PONTUAÇÃO DE PARTICIPANTE
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
    -- Buscar configuração da competição
    SELECT * INTO v_competition
    FROM competitions
    WHERE id = p_competition_id;

    -- Se competição não existe ou não está ativa, sair
    IF v_competition IS NULL OR v_competition.status != 'active' THEN
        RETURN;
    END IF;

    -- Contar check-ins válidos no período da competição
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

    -- Contar academias únicas
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

    -- Calcular streak (simplificado - dias consecutivos com check-in)
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

    -- Calcular pontuação baseada na regra
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

    -- Atualizar participante
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

COMMENT ON FUNCTION update_participant_score IS 'Atualiza pontuação de um participante baseado nos check-ins e regra da competição';

-- ============================================================================
-- STEP 4: FUNÇÃO - ATUALIZAR RANKING DA COMPETIÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION update_competition_rankings(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Atualizar ranking de todos os participantes aceitos
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

COMMENT ON FUNCTION update_competition_rankings IS 'Recalcula ranking de todos os participantes de uma competição';

-- ============================================================================
-- STEP 5: FUNÇÃO - ENCERRAR COMPETIÇÕES AUTOMATICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_end_competitions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Encerrar competições que passaram da data final
    UPDATE competitions
    SET status = 'ended'
    WHERE status = 'active'
      AND end_date < NOW()
    RETURNING * INTO v_count;

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_end_competitions IS 'Encerra automaticamente competições que passaram da data final';

-- ============================================================================
-- STEP 6: TRIGGER - ATUALIZAR SCORE QUANDO HOUVER CHECK-IN
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_competition_scores()
RETURNS TRIGGER AS $$
DECLARE
    v_competition RECORD;
BEGIN
    -- Para cada competição ativa que o usuário participa
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
        -- Atualizar pontuação
        PERFORM update_participant_score(v_competition.id, NEW.user_id);
        
        -- Atualizar ranking
        PERFORM update_competition_rankings(v_competition.id);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_checkin_update_competitions ON checkins;
CREATE TRIGGER trigger_checkin_update_competitions
    AFTER INSERT ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_competition_scores();

COMMENT ON FUNCTION trigger_update_competition_scores IS 'Trigger que atualiza pontuações quando há novo check-in';

-- ============================================================================
-- STEP 7: VIEW - RANKING CONSOLIDADO
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

COMMENT ON VIEW competition_leaderboard IS 'View consolidada de rankings de todas as competições';

-- ============================================================================
-- STEP 8: RLS POLICIES
-- ============================================================================

-- Competições
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver competições públicas ou que participa
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

-- Apenas criador pode editar
CREATE POLICY "Criador pode editar competição"
ON competitions FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Apenas criador pode deletar
CREATE POLICY "Criador pode deletar competição"
ON competitions FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

-- Qualquer usuário pode criar
CREATE POLICY "Usuários podem criar competições"
ON competitions FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Participantes
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- Usuários veem participantes de competições que têm acesso
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

-- Criador da competição pode adicionar participantes
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

-- Participante pode atualizar próprio status (aceitar/recusar)
CREATE POLICY "Participante pode atualizar próprio status"
ON competition_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 9: SEED - COMPETIÇÃO DE EXEMPLO (OPCIONAL)
-- ============================================================================

-- Criar uma competição de exemplo (comentado por padrão)
/*
INSERT INTO competitions (
    creator_id,
    name,
    description,
    modality_filter,
    scoring_rule,
    start_date,
    end_date,
    is_public
) VALUES (
    (SELECT id FROM users LIMIT 1), -- Primeiro usuário
    'Desafio de Verão 2025',
    'Quem treina mais em 30 dias?',
    'all',
    'total_checkins',
    NOW(),
    NOW() + INTERVAL '30 days',
    true
);
*/

-- ============================================================================
-- ROLLBACK SCRIPT (COMENTADO - USAR APENAS SE NECESSÁRIO)
-- ============================================================================

/*
-- Para reverter esta migração:

DROP TRIGGER IF EXISTS trigger_checkin_update_competitions ON checkins;
DROP FUNCTION IF EXISTS trigger_update_competition_scores();
DROP FUNCTION IF EXISTS auto_end_competitions();
DROP FUNCTION IF EXISTS update_competition_rankings(UUID);
DROP FUNCTION IF EXISTS update_participant_score(UUID, UUID);
DROP FUNCTION IF EXISTS update_competitions_updated_at();

DROP VIEW IF EXISTS competition_leaderboard;

DROP POLICY IF EXISTS "Usuários veem competições públicas ou próprias" ON competitions;
DROP POLICY IF EXISTS "Criador pode editar competição" ON competitions;
DROP POLICY IF EXISTS "Criador pode deletar competição" ON competitions;
DROP POLICY IF EXISTS "Usuários podem criar competições" ON competitions;
DROP POLICY IF EXISTS "Usuários veem participantes de competições acessíveis" ON competition_participants;
DROP POLICY IF EXISTS "Criador pode adicionar participantes" ON competition_participants;
DROP POLICY IF EXISTS "Participante pode atualizar próprio status" ON competition_participants;

DROP TABLE IF EXISTS competition_participants CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
*/

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

-- Verificação final
DO $$
BEGIN
    RAISE NOTICE 'Migração de Competições concluída com sucesso!';
    RAISE NOTICE 'Tabelas criadas: competitions, competition_participants';
    RAISE NOTICE 'Funções criadas: 4';
    RAISE NOTICE 'Trigger criado: trigger_checkin_update_competitions';
    RAISE NOTICE 'View criada: competition_leaderboard';
END $$;
