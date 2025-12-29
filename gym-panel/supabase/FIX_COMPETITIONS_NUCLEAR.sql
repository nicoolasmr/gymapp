-- NUCLEAR FIX: DROP ALL POLICIES AND TRIGGERS TO RESOLVE 500 ERROR
-- This script cleans up ANY conflicting policies/triggers causing "Infinite Recursion" or Server Errors

-- 1. DROP ALL POLICIES ON competitions
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'competitions' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON competitions', pol.policyname); 
    END LOOP; 
END $$;

-- 2. DROP ALL POLICIES ON competition_participants
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'competition_participants' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON competition_participants', pol.policyname); 
    END LOOP; 
END $$;

-- 3. DROP ALL TRIGGERS ON competitions
DO $$ 
DECLARE 
    trig record; 
BEGIN 
    -- Be careful not to drop system triggers, though normally user triggers are handled here
    FOR trig IN SELECT tgname FROM pg_trigger WHERE tgrelid = 'competitions'::regclass AND tgisinternal = false
    LOOP 
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON competitions', trig.tgname); 
    END LOOP; 
END $$;

-- 4. DROP ALL TRIGGERS ON competition_participants
DO $$ 
DECLARE 
    trig record; 
BEGIN 
    FOR trig IN SELECT tgname FROM pg_trigger WHERE tgrelid = 'competition_participants'::regclass AND tgisinternal = false
    LOOP 
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON competition_participants', trig.tgname); 
    END LOOP; 
END $$;

-- 5. RE-ENABLE RLS AND CREATE FRESH, SIMPLE POLICIES
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- 5.1 Competitions Policies
CREATE POLICY "View competitions" ON competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create competitions" ON competitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Update own competitions" ON competitions FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Delete own competitions" ON competitions FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- 5.2 Participants Policies
CREATE POLICY "View participants" ON competition_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Join or Invite participants" ON competition_participants FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id OR auth.uid() = invited_by);
CREATE POLICY "Update own participation" ON competition_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 6. ENSURE FUNCTIONS EXIST (Just in case)
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
    SELECT scoring_rule, start_date, end_date 
    INTO v_scoring_rule, v_start_date, v_end_date
    FROM competitions WHERE id = p_competition_id;
    
    IF v_scoring_rule = 'total_checkins' THEN
        SELECT COUNT(*) INTO v_score 
        FROM checkins 
        WHERE user_id = p_user_id 
        AND created_at BETWEEN v_start_date AND v_end_date;
    ELSIF v_scoring_rule = 'unique_academies' THEN
        SELECT COUNT(DISTINCT academy_id) INTO v_score
        FROM checkins
        WHERE user_id = p_user_id
        AND created_at BETWEEN v_start_date AND v_end_date;
    ELSE
        v_score := 0;
    END IF;
    
    UPDATE competition_participants
    SET score = v_score, updated_at = NOW()
    WHERE competition_id = p_competition_id AND user_id = p_user_id;
END;
$$;
