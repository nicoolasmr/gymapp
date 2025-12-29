-- ==============================================================================
-- 🚀 MVP 0.6.4: PAYOUT ENGINE & FINANCIAL CLOSING
-- ==============================================================================

-- 1. Tabela de Períodos de Fechamento (Snapshots)
CREATE TABLE IF NOT EXISTS payout_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- "Janeiro 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'processing', 'closed', 'paid'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 2. Tabela de Payouts por Academia (Resumo)
CREATE TABLE IF NOT EXISTS payout_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES payout_periods(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id),
    
    total_checkins INTEGER NOT NULL DEFAULT 0,
    checkin_value_cents INTEGER NOT NULL, -- Valor unitário usado no cálculo
    total_amount_cents INTEGER NOT NULL DEFAULT 0, -- Valor final a pagar
    
    status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'paid', 'rejected'
    notes TEXT,
    
    transaction_receipt_url TEXT, -- Comprovante do PIX
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(period_id, academy_id)
);

-- 3. Função RPC: Calcular Fechamento (Heavy Lifting)
-- Esta função congela os números. Deve ser chamada pelo Admin.
CREATE OR REPLACE FUNCTION compute_payout_run(p_period_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start DATE;
    v_end DATE;
    r_academy RECORD;
    v_checkin_count INTEGER;
    v_payout_val INTEGER; -- Valor unitário (ex: R$ 15,00)
BEGIN
    -- 1. Get dates
    SELECT start_date, end_date INTO v_start, v_end FROM payout_periods WHERE id = p_period_id;
    
    -- 2. Loop academies (active)
    FOR r_academy IN SELECT id, name, type FROM academies WHERE status = 'active'
    LOOP
        -- 2.1 Count VALIDATED checkins in period
        SELECT COUNT(*) INTO v_checkin_count
        FROM checkins
        WHERE academy_id = r_academy.id
        AND status = 'validated' -- Only validated counts!
        AND created_at::date >= v_start
        AND created_at::date <= v_end;
        
        -- 2.2 Determine Value per Checkin (Business Rule Simples por enquanto)
        -- Futuro: Tabela de contratos specífica.
        -- MVP: Crossfit = 2500, Gym = 1500, Studio = 2000 (cents)
        IF r_academy.type = 'crossfit' THEN v_payout_val := 2500;
        ELSIF r_academy.type = 'studio' THEN v_payout_val := 2000;
        ELSE v_payout_val := 1500; -- Academia normal
        END IF;

        -- 2.3 Insert or Update Run
        INSERT INTO payout_runs (period_id, academy_id, total_checkins, checkin_value_cents, total_amount_cents)
        VALUES (
            p_period_id, 
            r_academy.id, 
            v_checkin_count, 
            v_payout_val, 
            (v_checkin_count * v_payout_val)
        )
        ON CONFLICT (period_id, academy_id) 
        DO UPDATE SET 
            total_checkins = EXCLUDED.total_checkins,
            total_amount_cents = EXCLUDED.total_amount_cents,
            updated_at = NOW(); -- Assumindo que o campo updated_at exista ou trigger o atualize
            
    END LOOP;
    
    -- 3. Update Period Status
    UPDATE payout_periods SET status = 'processing' WHERE id = p_period_id;
END;
$$;

-- 4. Policies (Segurança)
ALTER TABLE payout_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_runs ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
CREATE POLICY "Admins manage payouts" ON payout_periods FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
);

-- Parceiros veem SEUS payouts (apenas leitura)
CREATE POLICY "Partners view own payouts" ON payout_runs FOR SELECT USING (
    -- Simplificado: User deve ser dono da academia
    EXISTS (SELECT 1 FROM academies WHERE id = payout_runs.academy_id AND owner_id = auth.uid()) 
    OR 
    -- Ou admin
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
);

-- Grant privileges
GRANT ALL ON payout_periods TO service_role;
GRANT ALL ON payout_runs TO service_role;
