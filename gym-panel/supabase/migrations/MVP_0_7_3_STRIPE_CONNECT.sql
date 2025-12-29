-- ==============================================================================
-- 🚀 MVP 0.7.3: STRIPE CONNECT PAYOUT AUTOMATION
-- ==============================================================================

-- 1. Estender Tabela de Academias (Connect Account)
DO $$ 
BEGIN
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS connect_onboarding_status TEXT DEFAULT 'not_started';
    -- Status: not_started, pending, active, restricted, disabled
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS connect_charges_enabled BOOLEAN DEFAULT false;
    ALTER TABLE academies ADD COLUMN IF NOT EXISTS connect_payouts_enabled BOOLEAN DEFAULT false;
END $$;

CREATE INDEX IF NOT EXISTS idx_academies_connect ON academies(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- 2. Tabela de Transferências (Auditoria de Payouts)
CREATE TABLE IF NOT EXISTS payout_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_run_id UUID REFERENCES payout_runs(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id),
    
    amount_cents INTEGER NOT NULL,
    stripe_transfer_id TEXT, -- ID da transferência no Stripe
    stripe_connect_account_id TEXT NOT NULL,
    
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'reversed'
    error_message TEXT,
    
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    metadata JSONB, -- Extra info (ex: período, descrição)
    
    UNIQUE(payout_run_id, academy_id) -- Idempotência: 1 transfer por run por academia
);

CREATE INDEX IF NOT EXISTS idx_transfers_run ON payout_transfers(payout_run_id);
CREATE INDEX IF NOT EXISTS idx_transfers_academy ON payout_transfers(academy_id);
CREATE INDEX IF NOT EXISTS idx_transfers_stripe ON payout_transfers(stripe_transfer_id);

-- 3. Atualizar Payout Runs (Adicionar Automation Flag)
DO $$ 
BEGIN
    ALTER TABLE payout_runs ADD COLUMN IF NOT EXISTS transfer_method TEXT DEFAULT 'manual';
    -- 'manual' (CSV export) ou 'stripe_connect' (automated)
    ALTER TABLE payout_runs ADD COLUMN IF NOT EXISTS automated_at TIMESTAMPTZ;
END $$;

-- 4. RPC: Iniciar Onboarding Connect
CREATE OR REPLACE FUNCTION create_connect_account_link(
    p_academy_id UUID,
    p_return_url TEXT,
    p_refresh_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_connect_id TEXT;
BEGIN
    -- Verificar se já existe
    SELECT stripe_connect_account_id INTO v_connect_id 
    FROM academies 
    WHERE id = p_academy_id;
    
    IF v_connect_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Connect account already exists',
            'account_id', v_connect_id
        );
    END IF;
    
    -- Atualizar status (o backend criará a conta via API)
    UPDATE academies 
    SET connect_onboarding_status = 'pending'
    WHERE id = p_academy_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;

-- 5. RPC: Executar Payout Automático (Dry Run ou Real)
CREATE OR REPLACE FUNCTION execute_automated_payout(
    p_period_id UUID,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_run RECORD;
    v_total_amount INTEGER := 0;
    v_transfer_count INTEGER := 0;
    v_results JSONB := '[]'::jsonb;
BEGIN
    -- Buscar todos os runs do período que ainda não foram pagos
    FOR v_run IN 
        SELECT pr.*, a.stripe_connect_account_id, a.name as academy_name
        FROM payout_runs pr
        JOIN academies a ON pr.academy_id = a.id
        WHERE pr.period_id = p_period_id
        AND pr.status = 'approved' -- Só paga se aprovado
        AND a.stripe_connect_account_id IS NOT NULL
        AND a.connect_payouts_enabled = true
    LOOP
        v_total_amount := v_total_amount + v_run.total_amount_cents;
        v_transfer_count := v_transfer_count + 1;
        
        IF NOT p_dry_run THEN
            -- Inserir registro de transferência (o backend fará a chamada Stripe)
            INSERT INTO payout_transfers (
                payout_run_id, 
                academy_id, 
                amount_cents, 
                stripe_connect_account_id,
                status,
                metadata
            ) VALUES (
                v_run.id,
                v_run.academy_id,
                v_run.total_amount_cents,
                v_run.stripe_connect_account_id,
                'pending',
                jsonb_build_object('period_id', p_period_id, 'academy_name', v_run.academy_name)
            )
            ON CONFLICT (payout_run_id, academy_id) DO NOTHING; -- Idempotência
        END IF;
        
        v_results := v_results || jsonb_build_object(
            'academy_id', v_run.academy_id,
            'academy_name', v_run.academy_name,
            'amount_cents', v_run.total_amount_cents,
            'connect_account', v_run.stripe_connect_account_id
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'dry_run', p_dry_run,
        'total_transfers', v_transfer_count,
        'total_amount_cents', v_total_amount,
        'transfers', v_results
    );
END;
$$;

-- 6. Policies (RLS)
ALTER TABLE payout_transfers ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
CREATE POLICY "Admins manage transfers" ON payout_transfers FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
);

-- Parceiros veem suas próprias transferências
CREATE POLICY "Partners view own transfers" ON payout_transfers FOR SELECT USING (
    EXISTS (SELECT 1 FROM academies WHERE id = payout_transfers.academy_id AND owner_id = auth.uid())
);

-- Grant privileges
GRANT ALL ON payout_transfers TO service_role;
