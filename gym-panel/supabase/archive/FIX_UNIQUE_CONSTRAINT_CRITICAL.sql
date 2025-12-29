-- CRITICAL DATABASE FIX: MISSING UNIQUE CONSTRAINT
-- Error "42P10" confirms that the database is missing a rule preventing duplicate participants.
-- This causes BOTH the "RPC" and "Standard Join" to fail immediately.

-- 1. Clean up any existing duplicates (keeps the latest one)
DELETE FROM competition_participants a USING (
      SELECT MIN(ctid) as ctid, competition_id, user_id
      FROM competition_participants 
      GROUP BY competition_id, user_id HAVING COUNT(*) > 1
      ) b
      WHERE a.competition_id = b.competition_id 
      AND a.user_id = b.user_id 
      AND a.ctid <> b.ctid;

-- 2. Add the missing Unique Constraint
-- This allows "ON CONFLICT" permissions to work
ALTER TABLE competition_participants
DROP CONSTRAINT IF EXISTS unique_competition_participant;

ALTER TABLE competition_participants
ADD CONSTRAINT unique_competition_participant UNIQUE (competition_id, user_id);

-- 3. Re-create the RPC to ensure it uses the correct constraint naming if implied, 
-- although ON CONFLICT (cols) usually works with any unique index on those cols.
CREATE OR REPLACE FUNCTION join_competition(p_competition_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'not_authenticated');
    END IF;

    -- Upsert Participant
    INSERT INTO competition_participants (competition_id, user_id, status, invited_by, joined_at, updated_at)
    VALUES (p_competition_id, v_user_id, 'accepted', v_user_id, NOW(), NOW())
    ON CONFLICT (competition_id, user_id) 
    DO UPDATE SET 
        status = 'accepted',
        updated_at = NOW();
        
    RETURN jsonb_build_object('success', true);
END;
$$;
