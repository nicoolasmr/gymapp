-- FIX: LEAVE COMPETITION (RPC & POLICY)
-- Ensures the backend function and permission rule for "Leaving" exist.

-- 1. Create/Replace RPC (Secure Method)
CREATE OR REPLACE FUNCTION leave_competition(p_competition_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    DELETE FROM competition_participants
    WHERE competition_id = p_competition_id
    AND user_id = v_user_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Create RLS Policy for Delete (Fallback Method)
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Delete own participation" ON competition_participants;
CREATE POLICY "Delete own participation" ON competition_participants 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- 3. Grant permissions (just in case)
GRANT EXECUTE ON FUNCTION leave_competition(UUID) TO authenticated;
GRANT DELETE ON competition_participants TO authenticated;
