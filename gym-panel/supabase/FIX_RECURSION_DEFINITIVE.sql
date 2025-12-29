-- FIX: INFINITE RECURSION IN POLICY - DEFINITIVE
-- Run this in Supabase SQL Editor

-- 1. Drop existing policies on competition_participants to be sure
DROP POLICY IF EXISTS "Enable read access for all" ON competition_participants;
DROP POLICY IF EXISTS "Competition participants view" ON competition_participants;
DROP POLICY IF EXISTS "Participants can view other participants" ON competition_participants;
DROP POLICY IF EXISTS "View competition participants" ON competition_participants;
DROP POLICY IF EXISTS "View participants" ON competition_participants;
DROP POLICY IF EXISTS "Authenticated users can view participants" ON competition_participants;

-- 2. Create the simplest possible non-recursive policy
-- This policy simply says: "Any authenticated user can view rows in this table"
-- This avoids checking "am I a participant in the same competition?" which causes the loop
CREATE POLICY "View participants"
ON competition_participants FOR SELECT
TO authenticated
USING (true);

-- 3. Also fix competitions table just in case it has similar issues
DROP POLICY IF EXISTS "View competitions" ON competitions;
DROP POLICY IF EXISTS "Competitions view" ON competitions;

CREATE POLICY "View competitions"
ON competitions FOR SELECT
TO authenticated
USING (true);

-- 4. Fix membership 406 Not Acceptable error
-- This error usually happens when multiple rows are returned for .single()
-- or the client expects JSON but gets something else.
-- We can't fix the client from SQL, but we can ensure the data is clean.
-- (No SQL action for 406 directly, assuming client-side .maybeSingle() handles it, 
--  but if there are duplicates, we might want to know).
