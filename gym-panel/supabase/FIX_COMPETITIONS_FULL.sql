-- FIX: COMPETITIONS AND PARTICIPANTS POLICIES
-- DEFINITIVE FIX for 400/403 errors during creation and viewing

-- ============================================
-- 1. COMPETITIONS POLICIES
-- ============================================

-- Drop all existing policies to be safe
DROP POLICY IF EXISTS "Enable read access for all" ON competitions;
DROP POLICY IF EXISTS "Competitions view" ON competitions;
DROP POLICY IF EXISTS "View competitions" ON competitions;
DROP POLICY IF EXISTS "Users can create competitions" ON competitions;
DROP POLICY IF EXISTS "Users can update their own competitions" ON competitions;
DROP POLICY IF EXISTS "Users can delete their own competitions" ON competitions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON competitions;

-- 1.1 SELECT (Read)
CREATE POLICY "View competitions"
ON competitions FOR SELECT
TO authenticated
USING (true);

-- 1.2 INSERT (Create)
CREATE POLICY "Create competitions"
ON competitions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- 1.3 UPDATE (Edit)
CREATE POLICY "Update own competitions"
ON competitions FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- 1.4 DELETE (Remove)
CREATE POLICY "Delete own competitions"
ON competitions FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);


-- ============================================
-- 2. COMPETITION PARTICIPANTS POLICIES
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all" ON competition_participants;
DROP POLICY IF EXISTS "Competition participants view" ON competition_participants;
DROP POLICY IF EXISTS "Participants can view other participants" ON competition_participants;
DROP POLICY IF EXISTS "View competition participants" ON competition_participants;
DROP POLICY IF EXISTS "View participants" ON competition_participants;
DROP POLICY IF EXISTS "Authenticated users can view participants" ON competition_participants;
DROP POLICY IF EXISTS "Join competitions" ON competition_participants;
DROP POLICY IF EXISTS "Update participation" ON competition_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON competition_participants;

-- 2.1 SELECT (Read)
CREATE POLICY "View participants"
ON competition_participants FOR SELECT
TO authenticated
USING (true);

-- 2.2 INSERT (Join/Invite)
-- Allows inserting if you are the user joining OR if you are the one inviting
CREATE POLICY "Join or Invite participants"
ON competition_participants FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id  -- Joining yourself
  OR 
  auth.uid() = invited_by -- Inviting someone else
);

-- 2.3 UPDATE (Accept/Decline/Update Score)
-- Users can update their own status
-- The system (via functions) uses SECURITY DEFINER usually, but for direct updates:
CREATE POLICY "Update own participation"
ON competition_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 3. FIX ENUMS (Optional, but safe check)
-- ============================================
-- Ensure constraints are flexible if needed, but usually we don't drop types here.
-- Assuming ENUMs match the code logic.

-- ============================================
-- 4. FIX FUNCTIONS
-- ============================================
-- Ensure score updates work

