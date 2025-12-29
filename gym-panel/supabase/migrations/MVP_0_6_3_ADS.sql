-- ==============================================================================
-- 🚀 MVP 0.6.3: ADS & MONETIZATION ENGINE
-- ==============================================================================

-- 1. Campanhas de Anúncios
CREATE TABLE IF NOT EXISTS ads_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    placement TEXT NOT NULL, -- 'home_hero', 'search_top', 'map_pin'
    title TEXT NOT NULL,
    creative_url TEXT, -- Imagem do banner se houver
    cta_link TEXT, -- Link para perfil ou externo
    
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    
    status TEXT DEFAULT 'pending_payment', -- 'pending_approval', 'active', 'paused', 'ended', 'rejected'
    budget_total_cents INTEGER NOT NULL DEFAULT 0,
    daily_cap_cents INTEGER, -- Opcional
    
    stripe_subscription_id TEXT, -- Se for recorrente
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Analytics (High Volume Table)
CREATE TABLE IF NOT EXISTS ads_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Pode mudar para BIGSERIAL em scale
    campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Nullable (visitantes não logados?)
    event_type TEXT NOT NULL, -- 'impression', 'click', 'conversion'
    metadata JSONB DEFAULT '{}'::JSONB, -- device info, lat/lng
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para Analytics Rápido
CREATE INDEX IF NOT EXISTS idx_ads_events_campaign ON ads_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_events_date ON ads_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads_campaigns(status);

-- 3. Função RPC para Tracking Seguro (App chama isso)
CREATE OR REPLACE FUNCTION track_ad_event(p_campaign_id UUID, p_event_type TEXT, p_metadata JSONB DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO ads_events (campaign_id, user_id, event_type, metadata)
    VALUES (p_campaign_id, auth.uid(), p_event_type, p_metadata);
END;
$$;

-- 4. View de Performance para Dashboard do Parceiro
CREATE OR REPLACE VIEW view_ads_performance AS
SELECT 
    c.id as campaign_id,
    c.academy_id,
    c.title,
    c.status,
    COUNT(CASE WHEN e.event_type = 'impression' THEN 1 END) as impressions,
    COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) as clicks,
    -- CTR (Click Through Rate)
    CASE 
        WHEN COUNT(CASE WHEN e.event_type = 'impression' THEN 1 END) > 0 
        THEN ROUND((COUNT(CASE WHEN e.event_type = 'click' THEN 1 END)::numeric / COUNT(CASE WHEN e.event_type = 'impression' THEN 1 END)::numeric) * 100, 2)
        ELSE 0 
    END as ctr_percentage
FROM ads_campaigns c
LEFT JOIN ads_events e ON c.id = e.campaign_id
GROUP BY c.id, c.academy_id;

-- 5. Policies
ALTER TABLE ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_events ENABLE ROW LEVEL SECURITY;

-- Parceiro vê suas campanhas
CREATE POLICY "Partners view own campaigns" ON ads_campaigns FOR SELECT USING (
    -- Simplificado para MVP: Auth user deve ser dono da academia
    -- No real world, check academy_owners table
    EXISTS (SELECT 1 FROM academies WHERE id = ads_campaigns.academy_id AND owner_id = auth.uid()) OR auth.role() = 'service_role'
);

-- Public vê campanhas ativas (para exibir no app)
CREATE POLICY "Public view active ads" ON ads_campaigns FOR SELECT USING (status = 'active');

-- Events: Só insert via RPC (Security Definer)
CREATE POLICY "No direct insert on events" ON ads_events FOR INSERT WITH CHECK (false);
-- Partners veem seus eventos via View (ou select se dono)
-- Adms veem tudo

GRANT ALL ON ads_campaigns TO service_role;
GRANT ALL ON ads_events TO service_role;
GRANT SELECT ON view_ads_performance TO authenticated;
