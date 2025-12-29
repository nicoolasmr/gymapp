-- NUCLEAR FIX V2: FORCE DROP EVERYTHING AND SIMPLIFY TO THE MAX
-- This script removes ALL complexity. No triggers, no functions for now. Just plain tables and policies.

-- 1. DROP EVERYTHING RELATED TO COMPETITIONS (CASCADE is key here)
DROP TABLE IF EXISTS competition_participants CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP VIEW IF EXISTS competition_leaderboard CASCADE;

-- 2. RECREATE TABLES (Minimal Structure)
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID, -- No foreign key constraint for now to avoid permission issues
    name TEXT,
    description TEXT,
    modality_filter TEXT,
    scoring_rule TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    is_public BOOLEAN DEFAULT false,
    max_participants INT DEFAULT 50,
    prize_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID, -- No foreign key constraint for now
    invited_by UUID, -- No foreign key constraint for now
    status TEXT DEFAULT 'pending',
    score NUMERIC DEFAULT 0,
    rank INT,
    total_checkins INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    unique_academies INT DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE RLS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- 4. CREATE PERMISSIVE POLICIES (Allow everything for authenticated users for debugging)
CREATE POLICY "Enable all for authenticated users" ON competitions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON competition_participants
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. RECREATE VIEW (Simple)
CREATE OR REPLACE VIEW competition_leaderboard AS
SELECT 
    cp.competition_id,
    cp.user_id,
    cp.score,
    cp.rank
FROM competition_participants cp;
