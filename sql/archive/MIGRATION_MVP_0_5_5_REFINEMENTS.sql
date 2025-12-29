-- ============================================================================
-- MIGRATION: MVP 0.5.5 - REFINAMENTOS E GESTÃO AVANÇADA
-- Descrição: Suporte a horários, turmas, repasse customizado e assinaturas manuais
-- Autor: Antigravity
-- Data: 2025-11-24
-- ============================================================================

-- 1. MELHORIAS NA TABELA ACADEMIES
-- Adicionar campos para gestão detalhada
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL, -- Ex: {"seg": "06:00-22:00", "sab": "08:00-14:00"}
ADD COLUMN IF NOT EXISTS classes_schedule JSONB DEFAULT NULL, -- Ex: [{"name": "Zumba", "time": "18:00", "days": ["seg", "qua"]}]
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT NULL, -- Ex: ["estacionamento", "chuveiro", "wifi"]
ADD COLUMN IF NOT EXISTS custom_repasse_value NUMERIC(10,2) DEFAULT NULL; -- Se não for NULL, sobrescreve o cálculo padrão

-- 2. FUNÇÃO PARA CALCULAR REPASSE (ATUALIZADA)
-- Agora considera o custom_repasse_value da academia se existir
CREATE OR REPLACE FUNCTION calculate_repasse(
    p_academy_id UUID,
    p_plan_id INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
    v_custom_repasse NUMERIC;
    v_plan_repasse NUMERIC;
BEGIN
    -- 1. Verifica se a academia tem um valor negociado fixo
    SELECT custom_repasse_value INTO v_custom_repasse
    FROM academies
    WHERE id = p_academy_id;
    
    IF v_custom_repasse IS NOT NULL THEN
        RETURN v_custom_repasse;
    END IF;

    -- 2. Se não, usa a regra do plano (padrão)
    SELECT repasse_per_checkin INTO v_plan_repasse
    FROM modality_plans
    WHERE id = p_plan_id;
    
    RETURN COALESCE(v_plan_repasse, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO PARA CONCEDER ASSINATURA MANUAL (ADMIN)
CREATE OR REPLACE FUNCTION grant_manual_subscription(
    p_user_id UUID,
    p_plan_id INTEGER, -- 1 (Solo) ou 2 (Familia)
    p_days_duration INTEGER DEFAULT 30,
    p_admin_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_membership_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Verificar se quem está chamando é admin
    SELECT (role IN ('admin', 'super_admin')) INTO v_is_admin
    FROM users
    WHERE id = p_admin_id;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Apenas administradores podem conceder assinaturas manuais.';
    END IF;

    -- Encerrar assinatura anterior se houver
    UPDATE memberships 
    SET status = 'canceled', updated_at = NOW()
    WHERE user_id = p_user_id AND status = 'active';

    -- Criar nova assinatura manual
    INSERT INTO memberships (
        user_id,
        modality_plan_id,
        status,
        start_date,
        renewal_date,
        payment_provider,
        stripe_subscription_id -- Usaremos NULL ou um identificador manual
    ) VALUES (
        p_user_id,
        p_plan_id,
        'active',
        NOW(),
        NOW() + (p_days_duration || ' days')::INTERVAL,
        'manual',
        'MANUAL_GRANT_BY_' || p_admin_id
    )
    RETURNING id INTO v_membership_id;

    -- Logar a ação
    PERFORM log_admin_action(
        'grant_subscription',
        'user',
        p_user_id,
        jsonb_build_object('plan_id', p_plan_id, 'duration', p_days_duration)
    );

    RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO PARA CRIAR USUÁRIO MANUALMENTE (Simplificada)
-- O Supabase Auth deve ser usado para criar o login real, mas podemos facilitar
-- inserindo na tabela users se o trigger não pegar (mas o trigger pega).
-- Então vamos focar apenas em garantir que o admin possa editar dados.

-- Trigger para atualizar updated_at em academies
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_academies_updated_at ON academies;
CREATE TRIGGER update_academies_updated_at
    BEFORE UPDATE ON academies
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Notificação de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Migração MVP 0.6 concluída: Campos de academia e funções manuais criadas.';
END $$;
