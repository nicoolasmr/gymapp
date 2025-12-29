-- ==============================================================================
-- 🚀 MVP 0.6.2: REVIEWS & REPUTATION SYSTEM (ENHANCED - FIXED)
-- ==============================================================================

-- 1. Melhoria na Tabela de Reviews
DO $$ 
BEGIN
    ALTER TABLE academy_reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
    ALTER TABLE academy_reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
    ALTER TABLE academy_reviews ADD COLUMN IF NOT EXISTS partner_reply TEXT;
    ALTER TABLE academy_reviews ADD COLUMN IF NOT EXISTS partner_replied_at TIMESTAMPTZ;
END $$;

-- 2. Tabela de Votos e Reports
CREATE TABLE IF NOT EXISTS review_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES academy_reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL, 
    reason TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- Trigger para atualizar helpful_count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.vote_type = 'helpful') THEN
        UPDATE academy_reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.vote_type = 'helpful') THEN
        UPDATE academy_reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.review_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_helpful_count ON review_votes;
CREATE TRIGGER trg_update_helpful_count
    AFTER INSERT OR DELETE ON review_votes
    FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- 3. Materialized View para Ranking
DROP MATERIALIZED VIEW IF EXISTS mv_academy_rankings;

CREATE MATERIALIZED VIEW mv_academy_rankings AS
SELECT 
    a.id as academy_id,
    a.name,
    COUNT(r.id) as review_count,
    ROUND(AVG(r.rating)::numeric, 1) as search_rating,
    ((5 * 4.5) + SUM(r.rating)) / (5 + COUNT(r.id)) as ranking_score
FROM academies a
LEFT JOIN academy_reviews r ON a.id = r.academy_id AND r.status = 'published'
GROUP BY a.id, a.name;

CREATE INDEX idx_mv_ranking_score ON mv_academy_rankings(ranking_score DESC);

-- Refresh Function
CREATE OR REPLACE FUNCTION refresh_academy_rankings()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_academy_rankings;
END;
$$ LANGUAGE plpgsql;

-- 4. Policies (Segurança - CORRIGIDA)
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users vote once" ON review_votes;
CREATE POLICY "Users vote once" ON review_votes 
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Função RPC para responder (Partner)
CREATE OR REPLACE FUNCTION reply_to_review(p_review_id UUID, p_reply TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_academy_id UUID;
BEGIN
    SELECT academy_id INTO v_academy_id FROM academy_reviews WHERE id = p_review_id;
    UPDATE academy_reviews 
    SET partner_reply = p_reply, partner_replied_at = NOW()
    WHERE id = p_review_id;
    RETURN jsonb_build_object('success', true);
END;
$$;
