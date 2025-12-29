-- ============================================================================
-- MIGRATION: MVP 0.5 - PART 3: SISTEMA DE CONVITES COM DESCONTO
-- Descrição: Crescimento orgânico via indicação com 10% de desconto
-- Autor: Antigravity (Senior Developer)
-- Data: 2025-11-24
-- Versão: 0.5.3
-- ============================================================================

-- ============================================================================
-- STEP 1: ADICIONAR CAMPOS EM USERS
-- ============================================================================

-- Adicionar código de convite único para cada usuário
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'referral_code'
    ) THEN
        ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
        ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES auth.users(id);
        
        CREATE INDEX idx_users_referral_code ON users(referral_code);
        CREATE INDEX idx_users_referred_by ON users(referred_by);
        
        COMMENT ON COLUMN users.referral_code IS 'Código único de convite do usuário';
        COMMENT ON COLUMN users.referred_by IS 'Quem convidou este usuário';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CRIAR TABELA DE CONVITES (REFERRALS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamentos
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Código usado
    referral_code TEXT NOT NULL,
    
    -- Email do convidado (antes de criar conta)
    referred_email TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired', 'cancelled')),
    
    -- Datas
    converted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (referred_id IS NOT NULL OR referred_email IS NOT NULL)
);

-- Índices
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_email ON referrals(referred_email);

COMMENT ON TABLE referrals IS 'Registro de convites enviados entre usuários';
COMMENT ON COLUMN referrals.status IS 'pending: aguardando cadastro, converted: converteu em assinatura, expired: expirou, cancelled: cancelado';

-- ============================================================================
-- STEP 3: CRIAR TABELA DE RECOMPENSAS (REFERRAL REWARDS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamentos
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Desconto
    discount_percentage DECIMAL(5,2) DEFAULT 10.00 CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    discount_amount DECIMAL(10,2), -- Valor em reais (calculado)
    
    -- Aplicação
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
    applied_to_membership_id UUID REFERENCES memberships(id),
    applied_at TIMESTAMPTZ,
    
    -- Validade
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
    
    -- Stripe
    stripe_coupon_id TEXT, -- ID do cupom criado no Stripe
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_rewards_referral ON referral_rewards(referral_id);
CREATE INDEX idx_rewards_user ON referral_rewards(user_id);
CREATE INDEX idx_rewards_status ON referral_rewards(status);
CREATE INDEX idx_rewards_pending ON referral_rewards(user_id, status) WHERE status = 'pending';

COMMENT ON TABLE referral_rewards IS 'Recompensas de desconto por indicação';
COMMENT ON COLUMN referral_rewards.discount_percentage IS 'Percentual de desconto (padrão 10%)';

-- ============================================================================
-- STEP 4: FUNÇÃO - GERAR CÓDIGO DE CONVITE ÚNICO
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
    v_attempts INTEGER := 0;
BEGIN
    LOOP
        -- Gerar código de 8 caracteres alfanuméricos
        v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
        
        -- Verificar se já existe
        SELECT EXISTS(
            SELECT 1 FROM users WHERE referral_code = v_code
        ) INTO v_exists;
        
        -- Se não existe, usar este código
        EXIT WHEN NOT v_exists;
        
        -- Limite de tentativas para evitar loop infinito
        v_attempts := v_attempts + 1;
        IF v_attempts > 100 THEN
            RAISE EXCEPTION 'Não foi possível gerar código único após 100 tentativas';
        END IF;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_referral_code IS 'Gera código de convite único de 8 caracteres';

-- ============================================================================
-- STEP 5: FUNÇÃO - CRIAR CONVITE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_referral(
    p_referrer_id UUID,
    p_referred_email TEXT DEFAULT NULL,
    p_referred_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_referral_id UUID;
    v_referral_code TEXT;
BEGIN
    -- Buscar código do referrer
    SELECT referral_code INTO v_referral_code
    FROM users
    WHERE id = p_referrer_id;
    
    -- Se não tem código, gerar um
    IF v_referral_code IS NULL THEN
        v_referral_code := generate_referral_code();
        UPDATE users SET referral_code = v_referral_code WHERE id = p_referrer_id;
    END IF;
    
    -- Criar registro de convite
    INSERT INTO referrals (
        referrer_id,
        referred_id,
        referred_email,
        referral_code,
        status
    ) VALUES (
        p_referrer_id,
        p_referred_id,
        p_referred_email,
        v_referral_code,
        CASE WHEN p_referred_id IS NOT NULL THEN 'pending' ELSE 'pending' END
    )
    RETURNING id INTO v_referral_id;
    
    RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_referral IS 'Cria um novo convite (referral)';

-- ============================================================================
-- STEP 6: FUNÇÃO - CONVERTER CONVITE EM RECOMPENSA
-- ============================================================================

CREATE OR REPLACE FUNCTION convert_referral(
    p_referral_code TEXT,
    p_referred_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_referral RECORD;
    v_reward_id UUID;
BEGIN
    -- Buscar convite pendente
    SELECT * INTO v_referral
    FROM referrals
    WHERE referral_code = p_referral_code
      AND (referred_id = p_referred_user_id OR referred_id IS NULL)
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Se não encontrou convite válido
    IF v_referral IS NULL THEN
        RAISE EXCEPTION 'Convite não encontrado ou expirado';
    END IF;
    
    -- Atualizar convite
    UPDATE referrals
    SET 
        status = 'converted',
        referred_id = p_referred_user_id,
        converted_at = NOW()
    WHERE id = v_referral.id;
    
    -- Atualizar usuário convidado
    UPDATE users
    SET referred_by = v_referral.referrer_id
    WHERE id = p_referred_user_id;
    
    -- Criar recompensa para quem convidou
    INSERT INTO referral_rewards (
        referral_id,
        user_id,
        discount_percentage,
        status
    ) VALUES (
        v_referral.id,
        v_referral.referrer_id,
        10.00,
        'pending'
    )
    RETURNING id INTO v_reward_id;
    
    RETURN v_reward_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION convert_referral IS 'Converte um convite em recompensa quando o convidado assina';

-- ============================================================================
-- STEP 7: FUNÇÃO - APLICAR DESCONTO
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_referral_discount(
    p_user_id UUID,
    p_membership_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_reward RECORD;
    v_membership RECORD;
    v_discount_amount DECIMAL;
    v_final_price DECIMAL;
BEGIN
    -- Buscar recompensa pendente mais antiga
    SELECT * INTO v_reward
    FROM referral_rewards
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Se não tem recompensa pendente
    IF v_reward IS NULL THEN
        RETURN json_build_object(
            'has_discount', false,
            'message', 'Nenhum desconto disponível'
        );
    END IF;
    
    -- Buscar membership
    SELECT m.*, mp.monthly_price
    INTO v_membership
    FROM memberships m
    JOIN modality_plans mp ON mp.id = m.modality_plan_id
    WHERE m.id = p_membership_id;
    
    -- Calcular desconto
    v_discount_amount := ROUND(v_membership.monthly_price * (v_reward.discount_percentage / 100), 2);
    v_final_price := v_membership.monthly_price - v_discount_amount;
    
    -- Atualizar recompensa
    UPDATE referral_rewards
    SET 
        status = 'applied',
        applied_to_membership_id = p_membership_id,
        applied_at = NOW(),
        discount_amount = v_discount_amount
    WHERE id = v_reward.id;
    
    RETURN json_build_object(
        'has_discount', true,
        'discount_percentage', v_reward.discount_percentage,
        'discount_amount', v_discount_amount,
        'original_price', v_membership.monthly_price,
        'final_price', v_final_price,
        'reward_id', v_reward.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_referral_discount IS 'Aplica desconto de referral a uma membership';

-- ============================================================================
-- STEP 8: TRIGGER - GERAR CÓDIGO AO CRIAR USUÁRIO
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Se não tem código, gerar um
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_referral_code ON users;
CREATE TRIGGER trigger_user_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_referral_code();

COMMENT ON FUNCTION trigger_generate_referral_code IS 'Gera código de convite automaticamente ao criar usuário';

-- ============================================================================
-- STEP 9: GERAR CÓDIGOS PARA USUÁRIOS EXISTENTES
-- ============================================================================

-- Atualizar usuários que não têm código
UPDATE users
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- ============================================================================
-- STEP 10: VIEW - ESTATÍSTICAS DE CONVITES
-- ============================================================================

CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.referral_code,
    COUNT(DISTINCT r.id) as total_invites,
    COUNT(DISTINCT CASE WHEN r.status = 'converted' THEN r.id END) as converted_invites,
    COUNT(DISTINCT rr.id) as total_rewards,
    COUNT(DISTINCT CASE WHEN rr.status = 'pending' THEN rr.id END) as pending_rewards,
    COUNT(DISTINCT CASE WHEN rr.status = 'applied' THEN rr.id END) as applied_rewards,
    COALESCE(SUM(CASE WHEN rr.status = 'applied' THEN rr.discount_amount ELSE 0 END), 0) as total_saved
FROM users u
LEFT JOIN referrals r ON r.referrer_id = u.id
LEFT JOIN referral_rewards rr ON rr.user_id = u.id
GROUP BY u.id, u.email, u.referral_code;

COMMENT ON VIEW referral_stats IS 'Estatísticas consolidadas de convites por usuário';

-- ============================================================================
-- STEP 11: RLS POLICIES
-- ============================================================================

-- Referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Usuário vê convites que enviou ou recebeu
CREATE POLICY "Usuários veem próprios convites"
ON referrals FOR SELECT
TO authenticated
USING (
    referrer_id = auth.uid() 
    OR referred_id = auth.uid()
);

-- Usuário pode criar convites
CREATE POLICY "Usuários podem criar convites"
ON referrals FOR INSERT
TO authenticated
WITH CHECK (referrer_id = auth.uid());

-- Apenas sistema pode atualizar status
CREATE POLICY "Sistema atualiza status de convites"
ON referrals FOR UPDATE
TO authenticated
USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Referral Rewards
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas próprias recompensas
CREATE POLICY "Usuários veem próprias recompensas"
ON referral_rewards FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Apenas sistema pode criar/atualizar recompensas
CREATE POLICY "Sistema gerencia recompensas"
ON referral_rewards FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- STEP 12: SEED - DADOS DE EXEMPLO (COMENTADO)
-- ============================================================================

/*
-- Exemplo de uso:

-- 1. Criar convite
SELECT create_referral(
    'user-id-do-convidador',
    'amigo@email.com'
);

-- 2. Quando amigo criar conta e assinar
SELECT convert_referral(
    'CODIGO123', -- código do convite
    'user-id-do-amigo'
);

-- 3. Aplicar desconto na próxima cobrança
SELECT apply_referral_discount(
    'user-id-do-convidador',
    'membership-id'
);
*/

-- ============================================================================
-- ROLLBACK SCRIPT (COMENTADO - USAR APENAS SE NECESSÁRIO)
-- ============================================================================

/*
-- Para reverter esta migração:

DROP TRIGGER IF EXISTS trigger_user_referral_code ON users;
DROP FUNCTION IF EXISTS trigger_generate_referral_code();
DROP FUNCTION IF EXISTS apply_referral_discount(UUID, UUID);
DROP FUNCTION IF EXISTS convert_referral(TEXT, UUID);
DROP FUNCTION IF EXISTS create_referral(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS generate_referral_code();

DROP VIEW IF EXISTS referral_stats;

DROP POLICY IF EXISTS "Usuários veem próprios convites" ON referrals;
DROP POLICY IF EXISTS "Usuários podem criar convites" ON referrals;
DROP POLICY IF EXISTS "Sistema atualiza status de convites" ON referrals;
DROP POLICY IF EXISTS "Usuários veem próprias recompensas" ON referral_rewards;
DROP POLICY IF EXISTS "Sistema gerencia recompensas" ON referral_rewards;

DROP TABLE IF EXISTS referral_rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
ALTER TABLE users DROP COLUMN IF EXISTS referred_by;
*/

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

-- Verificação final
DO $$
DECLARE
    v_users_with_code INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_users_with_code 
    FROM users 
    WHERE referral_code IS NOT NULL;
    
    RAISE NOTICE 'Migração de Convites concluída com sucesso!';
    RAISE NOTICE 'Tabelas criadas: referrals, referral_rewards';
    RAISE NOTICE 'Funções criadas: 4';
    RAISE NOTICE 'Trigger criado: trigger_user_referral_code';
    RAISE NOTICE 'View criada: referral_stats';
    RAISE NOTICE 'Usuários com código de convite: %', v_users_with_code;
END $$;
