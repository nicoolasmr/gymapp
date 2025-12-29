-- MASTER FIX: SOCIAL FEATURES (RPCs)
-- This creates secure functions to Join and Leave competitions, bypassing RLS issues.

-- 1. Ensure column exists (just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competition_participants' AND column_name = 'invited_by') THEN
        ALTER TABLE competition_participants ADD COLUMN invited_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. JOIN COMPETITION RPC
CREATE OR REPLACE FUNCTION join_competition(
    p_competition_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as admin, bypassing RLS
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not authenticated');
    END IF;

    -- Insert or Update (Upsert)
    INSERT INTO competition_participants (competition_id, user_id, status, invited_by, joined_at, updated_at)
    VALUES (p_competition_id, v_user_id, 'accepted', v_user_id, NOW(), NOW())
    ON CONFLICT (competition_id, user_id)
    DO UPDATE SET 
        status = 'accepted',
        updated_at = NOW();
        
    -- Recalculate score immediately
    PERFORM update_participant_score(p_competition_id, v_user_id);
        
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. LEAVE COMPETITION RPC
CREATE OR REPLACE FUNCTION leave_competition(p_competition_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as admin, bypassing RLS
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    DELETE FROM competition_participants
    WHERE competition_id = p_competition_id
    AND user_id = v_user_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    -- Fallback: Soft delete if hard delete fails for some constraint reason
    UPDATE competition_participants
    SET status = 'removed'
    WHERE competition_id = p_competition_id
    AND user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Soft deleted');
END;
$$;
