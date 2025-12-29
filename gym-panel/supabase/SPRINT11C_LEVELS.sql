-- ============================================
-- 🟢 SPRINT 11C: NÍVEL DE ATLETA + PROGRESSO + XP
-- ============================================

-- 1. Tabela: Níveis de Atleta (athlete_levels)
CREATE TABLE IF NOT EXISTS athlete_levels (
    id SERIAL PRIMARY KEY,
    level_name TEXT NOT NULL UNIQUE, -- Bronze, Prata, Ouro...
    min_xp INT NOT NULL,
    benefits JSONB DEFAULT '{}'::jsonb,
    badge_icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed de Níveis (Inserir dados iniciais)
INSERT INTO athlete_levels (level_name, min_xp, benefits) VALUES
('Bronze', 0, '{"description": "Acesso padrão ao app", "xp_multiplier": 1.0}'),
('Prata', 500, '{"description": "Missões extras semanais", "xp_multiplier": 1.0}'),
('Ouro', 1500, '{"description": "XP Multiplicador 1.1x, Desafios Exclusivos", "xp_multiplier": 1.1}'),
('Diamante', 4000, '{"description": "Prioridade em Rewards, Destaque no Ranking", "xp_multiplier": 1.25}'),
('Lendário', 10000, '{"description": "Status Global, Recompensas Especiais", "xp_multiplier": 1.5}')
ON CONFLICT (level_name) DO UPDATE 
SET min_xp = EXCLUDED.min_xp, benefits = EXCLUDED.benefits;


-- 2. Tabela: Progresso do Usuário (user_athlete_progress)
CREATE TABLE IF NOT EXISTS user_athlete_progress (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level_id INT REFERENCES athlete_levels(id) DEFAULT 1,
    current_xp INT DEFAULT 0, -- XP total acumulado
    total_xp INT DEFAULT 0, -- Histórico total (pode ser igual current se não resetar)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Função: Inicializar Progresso (se não existir)
CREATE OR REPLACE FUNCTION get_user_level_progress(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress RECORD;
    v_level RECORD;
    v_next_level RECORD;
BEGIN
    -- Busca progresso
    SELECT * INTO v_progress FROM user_athlete_progress WHERE user_id = p_user_id;

    -- Se não existir, cria
    IF NOT FOUND THEN
        INSERT INTO user_athlete_progress (user_id, current_level_id, current_xp, total_xp)
        VALUES (p_user_id, (SELECT id FROM athlete_levels WHERE min_xp = 0 LIMIT 1), 0, 0)
        RETURNING * INTO v_progress;
    END IF;

    -- Busca info do nível atual
    SELECT * INTO v_level FROM athlete_levels WHERE id = v_progress.current_level_id;

    -- Busca próximo nível
    SELECT * INTO v_next_level FROM athlete_levels 
    WHERE min_xp > v_progress.current_xp 
    ORDER BY min_xp ASC 
    LIMIT 1;

    RETURN jsonb_build_object(
        'current_xp', v_progress.current_xp,
        'level_name', v_level.level_name,
        'level_icon', v_level.badge_icon_url,
        'benefits', v_level.benefits,
        'next_level_xp', COALESCE(v_next_level.min_xp, v_progress.current_xp), -- Se null (max level), usa atual
        'is_max_level', v_next_level.id IS NULL
    );
END;
$$;


-- 4. Função: Adicionar XP (Core Logic)
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_amount INT, p_source TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress RECORD;
    v_current_level RECORD;
    v_new_level RECORD;
    v_level_up BOOLEAN := FALSE;
    v_final_xp INT;
    v_multiplier NUMERIC := 1.0;
BEGIN
    -- 1. Obter progresso atual
    SELECT * INTO v_progress FROM user_athlete_progress WHERE user_id = p_user_id;
    IF NOT FOUND THEN
         -- Inicializa se não existir
         INSERT INTO user_athlete_progress (user_id, current_level_id, current_xp, total_xp)
         VALUES (p_user_id, (SELECT id FROM athlete_levels WHERE min_xp = 0 LIMIT 1), 0, 0)
         RETURNING * INTO v_progress;
    END IF;

    -- 2. Obter multiplicador do nível atual
    SELECT benefits->>'xp_multiplier' INTO v_multiplier 
    FROM athlete_levels WHERE id = v_progress.current_level_id;
    
    IF v_multiplier IS NULL THEN v_multiplier := 1.0; END IF;

    -- 3. Calcular XP ganho
    v_final_xp := FLOOR(p_amount * v_multiplier);

    -- 4. Atualizar XP
    UPDATE user_athlete_progress
    SET current_xp = current_xp + v_final_xp,
        total_xp = total_xp + v_final_xp,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_progress;

    -- 5. Verificar Level Up
    SELECT * INTO v_new_level 
    FROM athlete_levels 
    WHERE min_xp <= v_progress.current_xp 
    ORDER BY min_xp DESC 
    LIMIT 1;

    IF v_new_level.id > v_progress.current_level_id THEN
        v_level_up := TRUE;
        
        -- Atualiza nível
        UPDATE user_athlete_progress
        SET current_level_id = v_new_level.id
        WHERE user_id = p_user_id;

        -- Criar notificação de Level Up (se existir sistema de notificação)
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_notification') THEN
             PERFORM send_notification(
                p_user_id, 
                '🎉 LEVEL UP!', 
                'Parabéns! Você alcançou o nível ' || v_new_level.level_name || '! Confira seus novos benefícios.', 
                'push', 
                'level_up'
             );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'xp_gained', v_final_xp,
        'new_total_xp', v_progress.current_xp,
        'level_up', v_level_up,
        'current_level', v_new_level.level_name
    );
END;
$$;


-- 5. Trigger: Ganhar XP no Check-in
CREATE OR REPLACE FUNCTION trigger_xp_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
    -- +10 XP por Check-in confirmado/validado (assume status 'validated' ou insert direto se preferir)
    -- Ajuste conforme seu fluxo de check-in. Aqui vou assumir quado status muda para 'validated' ou insert de um validado.
    
    -- Se for INSERT de checkin (assumindo que já entra validado ou lógica separada)
    -- OU Se for UPDATE para status = 'active'/'validated'
    
    -- Simplificação: Vamos dar XP na validação da procedure 'validate_checkin'.
    -- Mas como trigger é mais seguro para garantir consistência:
    
    IF (TG_OP = 'UPDATE' AND NEW.status = 'validated' AND OLD.status != 'validated') 
       OR (TG_OP = 'INSERT' AND NEW.status = 'validated') THEN
        
        PERFORM add_xp(NEW.user_id, 10, 'checkin');
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_xp_checkin ON checkins;
CREATE TRIGGER trg_xp_checkin
AFTER INSERT OR UPDATE ON checkins
FOR EACH ROW
EXECUTE FUNCTION trigger_xp_on_checkin();


-- Permissões
GRANT ALL ON athlete_levels TO authenticated;
GRANT ALL ON user_athlete_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_level_progress TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp TO authenticated;

