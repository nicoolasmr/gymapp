-- FIX: RPC FOR LEAVING COMPETITION
-- Using a Security Definer function ensures the deletion works regardless of complex RLS policies.

CREATE OR REPLACE FUNCTION leave_competition(p_competition_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner (bypasses RLS)
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    -- Attempt to delete the row where user is the calling user
    DELETE FROM competition_participants
    WHERE competition_id = p_competition_id
    AND user_id = auth.uid();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'Left competition');
    ELSE
        -- If hard delete found nothing (maybe logic issue or soft delete needed?), try update status
        UPDATE competition_participants
        SET status = 'removed'
        WHERE competition_id = p_competition_id
        AND user_id = auth.uid();
        
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        
        IF v_deleted_count > 0 THEN
             RETURN jsonb_build_object('success', true, 'message', 'Left competition (soft)');
        ELSE
             RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
        END IF;
    END IF;
END;
$$;
