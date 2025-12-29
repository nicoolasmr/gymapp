-- ============================================
-- 🟣 SPRINT 11A: ONBOARDING 7 DIAS + NOTIFICATIONS
-- ============================================

-- 1. Tabela de Estado do Onboarding
CREATE TABLE IF NOT EXISTS user_onboarding_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_day INT DEFAULT 1,
    current_step TEXT DEFAULT 'day_1_checkin', -- Ex: day_1_checkin, day_2_profile
    completed BOOLEAN DEFAULT FALSE,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_notification_sent_at TIMESTAMP WITH TIME ZONE
);

-- 2. Tabela de Objetivos do Usuário
CREATE TABLE IF NOT EXISTS user_goals (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    main_goal TEXT, -- gain_muscle, lose_fat, performance, health, habit
    training_frequency_target INT,
    preferred_times TEXT[], -- manhã, tarde, noite
    preferred_modalities TEXT[], -- crossfit, musculação, etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Função para obter estado (com inicialização automática)
CREATE OR REPLACE FUNCTION get_user_onboarding_state(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state RECORD;
BEGIN
    SELECT * INTO v_state FROM user_onboarding_state WHERE user_id = p_user_id;
    
    -- Se não existir, cria
    IF NOT FOUND THEN
        INSERT INTO user_onboarding_state (user_id)
        VALUES (p_user_id)
        RETURNING * INTO v_state;
    END IF;
    
    RETURN jsonb_build_object(
        'current_day', v_state.current_day,
        'current_step', v_state.current_step,
        'completed', v_state.completed,
        'started_at', v_state.started_at
    );
END;
$$;

-- 4. Função para avançar onboarding
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
        RETURN jsonb_build_object('success', false, 'message', 'State not found');
    END IF;
    
    IF v_state.completed THEN
         RETURN jsonb_build_object('success', true, 'message', 'Already completed');
    END IF;

    -- LÓGICA DE TRANSIÇÃO BASEADA NO DIA ATUAL E O EVENTO RECEBIDO
    -- DAY 1: Fazer check-in
    IF v_state.current_day = 1 AND p_event = 'checkin_completed' THEN
        v_new_day := 2;
        v_new_step := 'day_2_profile';
        v_updated := TRUE;
    
    -- DAY 2: Completar perfil
    ELSIF v_state.current_day = 2 AND p_event = 'profile_updated' THEN
        v_new_day := 3;
        v_new_step := 'day_3_community';
        v_updated := TRUE;
        
    -- DAY 3: Entrar em comunidade
    ELSIF v_state.current_day = 3 AND p_event = 'joined_community' THEN
        v_new_day := 4;
        v_new_step := 'day_4_friend';
        v_updated := TRUE;

    -- DAY 4: Seguir amigo
    ELSIF v_state.current_day = 4 AND p_event = 'friend_added' THEN
        v_new_day := 5;
        v_new_step := 'day_5_challenge';
        v_updated := TRUE;
        
    -- DAY 5: Participar desafio
    ELSIF v_state.current_day = 5 AND p_event = 'challenge_joined' THEN
        v_new_day := 6;
        v_new_step := 'day_6_new_training';
        v_updated := TRUE;
        
    -- DAY 6: Novo treino (tracking manual ou check-in)
    ELSIF v_state.current_day = 6 AND p_event = 'checkin_completed' THEN
        v_new_day := 7;
        v_new_step := 'day_7_stats';
        v_updated := TRUE;
        
    -- DAY 7: Ver stats
    ELSIF v_state.current_day = 7 AND p_event = 'stats_viewed' THEN
        v_new_day := 7;
        v_new_step := 'completed';
        v_updated := TRUE;
        
        UPDATE user_onboarding_state
        SET completed = TRUE, completed_at = NOW(), current_step = 'completed'
        WHERE user_id = p_user_id;
        
        RETURN jsonb_build_object('success', true, 'new_day', 7, 'completed', true);
    END IF;
    
    IF v_updated THEN
        UPDATE user_onboarding_state
        SET current_day = v_new_day, current_step = v_new_step, last_update = NOW()
        WHERE user_id = p_user_id;
        
        RETURN jsonb_build_object('success', true, 'new_day', v_new_day, 'completed', false);
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Event does not match current step');
    END IF;
END;
$$;

-- 5. Trigger para Auto-Avanço (Check-in)
CREATE OR REPLACE FUNCTION trigger_advance_onboarding_checkin()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM advance_user_onboarding(NEW.user_id, 'checkin_completed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_checkin ON checkins;
CREATE TRIGGER trg_onboarding_checkin
AFTER INSERT ON checkins
FOR EACH ROW
EXECUTE FUNCTION trigger_advance_onboarding_checkin();


-- 6. REGRAS DE NOTIFICAÇÃO (Adicionando à tabela notification_rules se existir)
-- Se a tabela não existir, o script continuará (erros ignorados em bloco DO)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_rules') THEN
        INSERT INTO notification_rules (rule_key, rule_type, condition, message_template) VALUES
        ('onboarding_day_1', 'onboarding', '{"day": 1}', '{"title": "🚀 Comece sua jornada!", "message": "Dia 1: Faça seu primeiro check-in e ganhe XP!"}'),
        ('onboarding_day_2', 'onboarding', '{"day": 2}', '{"title": "👤 Quem é você?", "message": "Dia 2: Complete seu perfil para encontrarmos o treino ideal."}'),
        ('onboarding_day_3', 'onboarding', '{"day": 3}', '{"title": "🤝 Encontre sua tribo", "message": "Dia 3: Entre em uma comunidade e não treine sozinho."}'),
        ('onboarding_day_4', 'onboarding', '{"day": 4}', '{"title": "👥 Amigos de treino", "message": "Dia 4: Conecte-se com amigos para se motivar."}'),
        ('onboarding_day_5', 'onboarding', '{"day": 5}', '{"title": "⚔️ Desafio Aceito?", "message": "Dia 5: Participe de um desafio e teste seus limites."}'),
        ('onboarding_day_6', 'onboarding', '{"day": 6}', '{"title": "🌎 Explore o novo", "message": "Dia 6: Que tal treinar em um lugar diferente hoje?"}'),
        ('onboarding_day_7', 'onboarding', '{"day": 7}', '{"title": "📊 Veja seu progresso", "message": "Dia 7: Confira suas estatísticas da semana!"}')
        ON CONFLICT (rule_key) DO NOTHING;
    END IF;
END $$;


-- 7. Função para Processar Notificações de Onboarding (Para Cron Job)
CREATE OR REPLACE FUNCTION process_onboarding_notifications()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_rule RECORD;
    v_count INT := 0;
BEGIN
    -- Percorre usuários que estão em onboarding (não completado)
    FOR v_user IN SELECT * FROM user_onboarding_state WHERE completed = FALSE LOOP
        
        -- Verifica se já recebeu notificação hoje (simples, baseada em last_notification_sent_at)
        IF v_user.last_notification_sent_at IS NULL OR v_user.last_notification_sent_at < CURRENT_DATE THEN
            
            -- Busca a regra para o dia atual do usuário
            SELECT * INTO v_rule FROM notification_rules 
            WHERE rule_key = 'onboarding_day_' || v_user.current_day;
            
            IF FOUND THEN
                -- Envia notificação
                PERFORM send_notification(
                    v_user.user_id,
                    v_rule.message_template->>'title',
                    v_rule.message_template->>'message',
                    'push',
                    'onboarding'
                );
                
                -- Atualiza timestamp
                UPDATE user_onboarding_state 
                SET last_notification_sent_at = NOW() 
                WHERE user_id = v_user.user_id;
                
                v_count := v_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN 'Notificações enviadas: ' || v_count;
END;
$$;

-- Permissões
GRANT ALL ON user_onboarding_state TO authenticated;
GRANT ALL ON user_goals TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_onboarding_state TO authenticated;
GRANT EXECUTE ON FUNCTION advance_user_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION process_onboarding_notifications TO authenticated;
