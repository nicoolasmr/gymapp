-- ============================================================================
-- MIGRATION: MVP 0.5 - PART 1: PRICING DINÂMICO
-- Descrição: Estrutura de pricing configurável por modalidade
-- Autor: Antigravity (Senior Developer)
-- Data: 2025-11-24
-- Versão: 0.5.1
-- ============================================================================

-- ============================================================================
-- STEP 1: CRIAR TABELA DE PLANOS POR MODALIDADE
-- ============================================================================

CREATE TABLE IF NOT EXISTS modality_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificação
    modality_type TEXT NOT NULL CHECK (modality_type IN ('gym_standard', 'crossfit_box', 'studio')),
    plan_type TEXT NOT NULL, -- 'solo', 'familia', '4x', '6x', 'ilimitado'
    plan_name TEXT NOT NULL,
    plan_description TEXT,
    
    -- Pricing
    monthly_price DECIMAL(10,2) NOT NULL CHECK (monthly_price > 0),
    
    -- Limites de uso
    max_checkins_per_day INTEGER DEFAULT 1 CHECK (max_checkins_per_day > 0),
    max_checkins_per_week INTEGER CHECK (max_checkins_per_week IS NULL OR max_checkins_per_week > 0),
    
    -- Repasse
    repasse_per_checkin DECIMAL(10,2) NOT NULL CHECK (repasse_per_checkin > 0),
    repasse_min DECIMAL(10,2), -- Faixa mínima (opcional)
    repasse_max DECIMAL(10,2), -- Faixa máxima (opcional)
    
    -- Margem alvo da plataforma (%)
    platform_margin_target DECIMAL(5,2) CHECK (platform_margin_target >= 0 AND platform_margin_target <= 100),
    
    -- Features especiais
    requires_reservation BOOLEAN DEFAULT false,
    allows_family_members BOOLEAN DEFAULT false,
    max_family_members INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true, -- Visível para novos cadastros
    
    -- Stripe
    stripe_price_id TEXT, -- ID do preço no Stripe
    stripe_product_id TEXT, -- ID do produto no Stripe
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(modality_type, plan_type),
    CHECK (repasse_min IS NULL OR repasse_max IS NULL OR repasse_min <= repasse_max)
);

-- Índices para performance
CREATE INDEX idx_modality_plans_type ON modality_plans(modality_type);
CREATE INDEX idx_modality_plans_active ON modality_plans(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_modality_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_modality_plans_updated_at
    BEFORE UPDATE ON modality_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_modality_plans_updated_at();

COMMENT ON TABLE modality_plans IS 'Configuração de planos por modalidade com regras de repasse';
COMMENT ON COLUMN modality_plans.modality_type IS 'Tipo de modalidade: gym_standard, crossfit_box, studio';
COMMENT ON COLUMN modality_plans.repasse_per_checkin IS 'Valor fixo de repasse por check-in/aula';
COMMENT ON COLUMN modality_plans.platform_margin_target IS 'Margem alvo da plataforma em percentual';

-- ============================================================================
-- STEP 2: CRIAR TABELA DE OVERRIDES DE REPASSE POR ACADEMIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS academy_pricing_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    modality_plan_id UUID NOT NULL REFERENCES modality_plans(id) ON DELETE CASCADE,
    
    -- Override de repasse (sobrescreve o padrão)
    custom_repasse DECIMAL(10,2) NOT NULL CHECK (custom_repasse > 0),
    
    -- Motivo do override (para auditoria)
    override_reason TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(academy_id, modality_plan_id)
);

CREATE INDEX idx_academy_pricing_academy ON academy_pricing_overrides(academy_id);
CREATE INDEX idx_academy_pricing_plan ON academy_pricing_overrides(modality_plan_id);

COMMENT ON TABLE academy_pricing_overrides IS 'Repasses customizados por academia (sobrescreve modality_plans)';

-- ============================================================================
-- STEP 3: ADICIONAR CAMPOS EM TABELAS EXISTENTES
-- ============================================================================

-- Adicionar referência ao plano em memberships
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memberships' AND column_name = 'modality_plan_id'
    ) THEN
        ALTER TABLE memberships ADD COLUMN modality_plan_id UUID REFERENCES modality_plans(id);
        CREATE INDEX idx_memberships_plan ON memberships(modality_plan_id);
    END IF;
END $$;

-- Adicionar valor de repasse em checkins (para histórico)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'checkins' AND column_name = 'repasse_value'
    ) THEN
        ALTER TABLE checkins ADD COLUMN repasse_value DECIMAL(10,2);
        COMMENT ON COLUMN checkins.repasse_value IS 'Valor de repasse calculado no momento do check-in';
    END IF;
END $$;

-- Adicionar dados bancários em academies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'academies' AND column_name = 'bank_account_number'
    ) THEN
        ALTER TABLE academies ADD COLUMN bank_account_number TEXT;
        ALTER TABLE academies ADD COLUMN bank_routing_number TEXT;
        ALTER TABLE academies ADD COLUMN bank_account_holder TEXT;
        ALTER TABLE academies ADD COLUMN cnpj TEXT;
        ALTER TABLE academies ADD COLUMN pix_key TEXT;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: FUNÇÃO RPC - CALCULAR REPASSE DINÂMICO
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_checkin_repasse(
    p_user_id UUID,
    p_academy_id UUID,
    p_checkin_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DECIMAL AS $$
DECLARE
    v_repasse DECIMAL;
    v_modality_plan_id UUID;
    v_custom_repasse DECIMAL;
BEGIN
    -- Buscar plano ativo do usuário
    SELECT modality_plan_id INTO v_modality_plan_id
    FROM memberships
    WHERE user_id = p_user_id 
      AND status = 'active'
      AND (end_date IS NULL OR end_date > p_checkin_date)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Se não encontrou plano ativo, retorna 0
    IF v_modality_plan_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Verificar se existe override específico para esta academia
    SELECT custom_repasse INTO v_custom_repasse
    FROM academy_pricing_overrides
    WHERE academy_id = p_academy_id
      AND modality_plan_id = v_modality_plan_id
      AND is_active = true
    LIMIT 1;

    -- Se existe override, usa ele
    IF v_custom_repasse IS NOT NULL THEN
        RETURN v_custom_repasse;
    END IF;

    -- Caso contrário, usa o repasse padrão do plano
    SELECT repasse_per_checkin INTO v_repasse
    FROM modality_plans
    WHERE id = v_modality_plan_id
      AND is_active = true;

    RETURN COALESCE(v_repasse, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_checkin_repasse IS 'Calcula o valor de repasse para um check-in baseado no plano do usuário e overrides da academia';

-- ============================================================================
-- STEP 5: FUNÇÃO RPC - VALIDAR LIMITES DE CHECK-IN
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_checkin_limits(
    p_user_id UUID,
    p_academy_id UUID,
    p_checkin_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
    v_plan RECORD;
    v_checkins_today INTEGER;
    v_checkins_week INTEGER;
    v_week_start TIMESTAMPTZ;
    v_result JSON;
BEGIN
    -- Buscar configuração do plano
    SELECT 
        mp.max_checkins_per_day,
        mp.max_checkins_per_week,
        mp.plan_name
    INTO v_plan
    FROM memberships m
    JOIN modality_plans mp ON mp.id = m.modality_plan_id
    WHERE m.user_id = p_user_id 
      AND m.status = 'active'
      AND (m.end_date IS NULL OR m.end_date > p_checkin_date)
    ORDER BY m.created_at DESC
    LIMIT 1;

    -- Se não tem plano ativo
    IF v_plan IS NULL THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'no_active_plan',
            'message', 'Nenhum plano ativo encontrado'
        );
    END IF;

    -- Verificar check-ins hoje
    SELECT COUNT(*) INTO v_checkins_today
    FROM checkins
    WHERE user_id = p_user_id
      AND DATE(created_at) = DATE(p_checkin_date);

    IF v_checkins_today >= v_plan.max_checkins_per_day THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'daily_limit_reached',
            'message', 'Você já atingiu o limite de check-ins de hoje',
            'limit', v_plan.max_checkins_per_day,
            'current', v_checkins_today
        );
    END IF;

    -- Verificar check-ins na semana (se houver limite)
    IF v_plan.max_checkins_per_week IS NOT NULL THEN
        -- Início da semana (domingo)
        v_week_start := date_trunc('week', p_checkin_date);
        
        SELECT COUNT(*) INTO v_checkins_week
        FROM checkins
        WHERE user_id = p_user_id
          AND created_at >= v_week_start
          AND created_at < v_week_start + INTERVAL '7 days';

        IF v_checkins_week >= v_plan.max_checkins_per_week THEN
            RETURN json_build_object(
                'allowed', false,
                'reason', 'weekly_limit_reached',
                'message', 'Você já atingiu o limite de check-ins desta semana',
                'limit', v_plan.max_checkins_per_week,
                'current', v_checkins_week,
                'plan_name', v_plan.plan_name
            );
        END IF;
    END IF;

    -- Tudo OK
    RETURN json_build_object(
        'allowed', true,
        'message', 'Check-in permitido'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_checkin_limits IS 'Valida se o usuário pode fazer check-in baseado nos limites do plano';

-- ============================================================================
-- STEP 6: SEED - PLANOS INICIAIS
-- ============================================================================

-- ACADEMIA CONVENCIONAL
INSERT INTO modality_plans (
    modality_type, plan_type, plan_name, plan_description,
    monthly_price, max_checkins_per_day, max_checkins_per_week,
    repasse_per_checkin, repasse_min, repasse_max,
    platform_margin_target, allows_family_members, max_family_members
) VALUES
(
    'gym_standard', 'solo', 'Academia Solo', 
    'Acesso ilimitado a academias convencionais',
    149.00, 1, NULL,
    9.00, 6.00, 12.00,
    35.00, false, 0
),
(
    'gym_standard', 'familia', 'Academia Família',
    'Acesso ilimitado para até 4 pessoas',
    449.00, 1, NULL,
    9.00, 6.00, 12.00,
    35.00, true, 4
)
ON CONFLICT (modality_type, plan_type) DO UPDATE SET
    monthly_price = EXCLUDED.monthly_price,
    repasse_per_checkin = EXCLUDED.repasse_per_checkin,
    updated_at = NOW();

-- CROSSFIT / BOX
INSERT INTO modality_plans (
    modality_type, plan_type, plan_name, plan_description,
    monthly_price, max_checkins_per_day, max_checkins_per_week,
    repasse_per_checkin, platform_margin_target
) VALUES
(
    'crossfit_box', '4x', 'CrossFit 4x/semana',
    'Até 4 treinos por semana em boxes parceiros',
    249.90, 1, 4,
    15.00, 15.00
),
(
    'crossfit_box', '6x', 'CrossFit 6x/semana',
    'Até 6 treinos por semana em boxes parceiros',
    349.90, 1, 6,
    10.00, 15.00
),
(
    'crossfit_box', 'ilimitado', 'CrossFit Ilimitado',
    'Treinos ilimitados em boxes parceiros',
    449.90, 1, NULL,
    9.00, 15.00
)
ON CONFLICT (modality_type, plan_type) DO UPDATE SET
    monthly_price = EXCLUDED.monthly_price,
    repasse_per_checkin = EXCLUDED.repasse_per_checkin,
    updated_at = NOW();

-- STUDIO (Pilates, Yoga, Dança, Lutas)
INSERT INTO modality_plans (
    modality_type, plan_type, plan_name, plan_description,
    monthly_price, max_checkins_per_day, max_checkins_per_week,
    repasse_per_checkin, repasse_min, repasse_max,
    platform_margin_target, requires_reservation, allows_family_members, max_family_members
) VALUES
(
    'studio', 'solo', 'Studio Solo',
    'Até 2 aulas por semana em estúdios parceiros',
    300.00, 1, 2,
    37.50, 25.00, 50.00,
    30.00, true, false, 0
),
(
    'studio', 'familia', 'Studio Família',
    'Até 2 aulas por semana para até 4 pessoas',
    1000.00, 1, 2,
    37.50, 25.00, 50.00,
    30.00, true, true, 4
)
ON CONFLICT (modality_type, plan_type) DO UPDATE SET
    monthly_price = EXCLUDED.monthly_price,
    repasse_per_checkin = EXCLUDED.repasse_per_checkin,
    updated_at = NOW();

-- ============================================================================
-- STEP 7: MIGRAR MEMBERSHIPS EXISTENTES
-- ============================================================================

-- Atualizar memberships existentes para apontar para os novos planos
-- Baseado no plano antigo (plans.name)

UPDATE memberships m
SET modality_plan_id = mp.id
FROM plans p, modality_plans mp
WHERE m.plan_id = p.id
  AND m.modality_plan_id IS NULL
  AND (
    -- Academia Solo
    (p.name ILIKE '%solo%' AND mp.modality_type = 'gym_standard' AND mp.plan_type = 'solo')
    OR
    -- Academia Família
    (p.name ILIKE '%fam%' AND mp.modality_type = 'gym_standard' AND mp.plan_type = 'familia')
  );

-- ============================================================================
-- STEP 8: ATUALIZAR CHECKINS EXISTENTES COM VALOR DE REPASSE
-- ============================================================================

-- Calcular e gravar repasse para check-ins históricos
UPDATE checkins c
SET repasse_value = calculate_checkin_repasse(c.user_id, c.academy_id, c.created_at)
WHERE repasse_value IS NULL;

-- ============================================================================
-- STEP 9: RLS POLICIES
-- ============================================================================

-- Permitir que usuários vejam planos ativos
ALTER TABLE modality_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos visíveis para todos autenticados"
ON modality_plans FOR SELECT
TO authenticated
USING (is_visible = true AND is_active = true);

-- Apenas admins podem modificar
CREATE POLICY "Apenas admins podem modificar planos"
ON modality_plans FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    )
);

-- Academy pricing overrides - apenas admins e donos da academia
ALTER TABLE academy_pricing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e donos veem overrides"
ON academy_pricing_overrides FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND (
            users.role IN ('admin', 'super_admin')
            OR users.id IN (
                SELECT owner_id FROM academies WHERE id = academy_pricing_overrides.academy_id
            )
        )
    )
);

-- ============================================================================
-- ROLLBACK SCRIPT (COMENTADO - USAR APENAS SE NECESSÁRIO)
-- ============================================================================

/*
-- Para reverter esta migração:

DROP POLICY IF EXISTS "Planos visíveis para todos autenticados" ON modality_plans;
DROP POLICY IF EXISTS "Apenas admins podem modificar planos" ON modality_plans;
DROP POLICY IF EXISTS "Admins e donos veem overrides" ON academy_pricing_overrides;

DROP FUNCTION IF EXISTS validate_checkin_limits(UUID, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS calculate_checkin_repasse(UUID, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS update_modality_plans_updated_at();

DROP TABLE IF EXISTS academy_pricing_overrides CASCADE;
DROP TABLE IF EXISTS modality_plans CASCADE;

ALTER TABLE memberships DROP COLUMN IF EXISTS modality_plan_id;
ALTER TABLE checkins DROP COLUMN IF EXISTS repasse_value;
ALTER TABLE academies DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE academies DROP COLUMN IF EXISTS bank_routing_number;
ALTER TABLE academies DROP COLUMN IF EXISTS bank_account_holder;
ALTER TABLE academies DROP COLUMN IF EXISTS cnpj;
ALTER TABLE academies DROP COLUMN IF EXISTS pix_key;
*/

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

-- Verificação final
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM modality_plans WHERE is_active = true;
    RAISE NOTICE 'Migração concluída com sucesso! % planos ativos criados.', v_count;
END $$;
