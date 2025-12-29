-- FIX: COMPETITIONS SCHEMA AND TABLE
-- Ensure the competitions table exists and has the correct columns and types matching the frontend service.

-- 1. COMPETITIONS TABLE
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    modality_filter TEXT CHECK (modality_filter IN ('gym_standard', 'crossfit_box', 'studio', 'all')),
    scoring_rule TEXT CHECK (scoring_rule IN ('total_checkins', 'streak_days', 'unique_academies')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
    is_public BOOLEAN DEFAULT false,
    max_participants INT DEFAULT 50,
    prize_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (if table existed but was missing columns)
DO $$
BEGIN
    -- Check modality_filter
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'modality_filter') THEN
        ALTER TABLE competitions ADD COLUMN modality_filter TEXT DEFAULT 'all';
    END IF;

    -- Check scoring_rule
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'scoring_rule') THEN
        ALTER TABLE competitions ADD COLUMN scoring_rule TEXT DEFAULT 'total_checkins';
    END IF;

    -- Check is_public
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'is_public') THEN
        ALTER TABLE competitions ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;


-- 2. COMPETITION PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
    score NUMERIC DEFAULT 0,
    rank INT,
    total_checkins INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    unique_academies INT DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, user_id)
);

-- Ensure columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competition_participants' AND column_name = 'invited_by') THEN
        ALTER TABLE competition_participants ADD COLUMN invited_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. LEADERBOARD VIEW (Optional/Required for service)
CREATE OR REPLACE VIEW competition_leaderboard AS
SELECT 
    cp.competition_id,
    cp.user_id,
    u.raw_user_meta_data->>'full_name' as user_name,
    u.email as user_email,
    RANK() OVER (PARTITION BY cp.competition_id ORDER BY cp.score DESC) as rank,
    cp.score,
    cp.total_checkins,
    cp.current_streak,
    cp.max_streak,
    cp.unique_academies
FROM competition_participants cp
JOIN auth.users u ON cp.user_id = u.id;

-- 4. POLICIES (Re-apply to be sure)
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- Competitions Policies
DROP POLICY IF EXISTS "View competitions" ON competitions;
CREATE POLICY "View competitions" ON competitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Create competitions" ON competitions;
CREATE POLICY "Create competitions" ON competitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Update own competitions" ON competitions;
CREATE POLICY "Update own competitions" ON competitions FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Delete own competitions" ON competitions;
CREATE POLICY "Delete own competitions" ON competitions FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Participants Policies
DROP POLICY IF EXISTS "View participants" ON competition_participants;
CREATE POLICY "View participants" ON competition_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Join or Invite participants" ON competition_participants;
CREATE POLICY "Join or Invite participants" ON competition_participants FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id OR auth.uid() = invited_by);

DROP POLICY IF EXISTS "Update own participation" ON competition_participants;
CREATE POLICY "Update own participation" ON competition_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 5. FUNCTION TO UPDATE PARTICIPANT SCORE (Needed by Service)
CREATE OR REPLACE FUNCTION update_participant_score(p_competition_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scoring_rule TEXT;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_score NUMERIC := 0;
BEGIN
    -- Get competition details
    SELECT scoring_rule, start_date, end_date 
    INTO v_scoring_rule, v_start_date, v_end_date
    FROM competitions WHERE id = p_competition_id;
    
    -- Calculate score based on rule
    IF v_scoring_rule = 'total_checkins' THEN
        SELECT COUNT(*) INTO v_score 
        FROM checkins 
        WHERE user_id = p_user_id 
        AND created_at BETWEEN v_start_date AND v_end_date;
        
    ELSIF v_scoring_rule = 'streak_days' THEN
        -- Simplified streak calc (needs proper logic in production)
        SELECT calculate_streak(p_user_id, v_start_date, v_end_date) INTO v_score;
        -- Fallback if function doesn't exist:
        IF v_score IS NULL THEN v_score := 0; END IF;
        
    ELSIF v_scoring_rule = 'unique_academies' THEN
        SELECT COUNT(DISTINCT academy_id) INTO v_score
        FROM checkins
        WHERE user_id = p_user_id
        AND created_at BETWEEN v_start_date AND v_end_date;
    END IF;
    
    -- Update participant
    UPDATE competition_participants
    SET score = v_score, updated_at = NOW()
    WHERE competition_id = p_competition_id AND user_id = p_user_id;
END;
$$;

-- Helper for streak (Placeholder)
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID, p_start DATE, p_end DATE) RETURNS INT AS $$
BEGIN
    RETURN 0; -- Implement actual streak logic if needed
END;
$$ LANGUAGE plpgsql;
