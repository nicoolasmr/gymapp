-- FIX: RECURSION IN POLICY
-- Run this in Supabase SQL Editor

-- 1. Drop existing problematic policies on competition_participants
DROP POLICY IF EXISTS "Enable read access for all" ON competition_participants;
DROP POLICY IF EXISTS "Competition participants view" ON competition_participants;
DROP POLICY IF EXISTS "Participants can view other participants" ON competition_participants;

-- 2. Create a simple non-recursive policy for viewing
-- Allow authenticated users to see participants (simplest fix to break recursion)
CREATE POLICY "View competition participants"
ON competition_participants FOR SELECT
TO authenticated
USING (true);

-- 3. Fix potential issues with get_user_progress if 409 persists
-- Ensures the function matches the call signature and type
DROP FUNCTION IF EXISTS get_user_progress(UUID);

CREATE OR REPLACE FUNCTION get_user_progress(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_engagement RECORD;
    v_checkins_last_7_days JSON;
BEGIN
    -- Busca ou cria engajamento
    SELECT * INTO v_engagement FROM user_engagement WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        INSERT INTO user_engagement (user_id) VALUES (p_user_id) RETURNING * INTO v_engagement;
    END IF;

    -- Checkins ultimos 7 dias
    SELECT json_agg(json_build_object('date', day::DATE, 'count', COALESCE(cnt, 0)) ORDER BY day)
    INTO v_checkins_last_7_days
    FROM generate_series(DATE_TRUNC('day', NOW() - INTERVAL '6 days'), DATE_TRUNC('day', NOW()), '1 day'::INTERVAL) AS day
    LEFT JOIN (
        SELECT DATE_TRUNC('day', created_at) AS d, COUNT(*) AS cnt
        FROM checkins WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY 1
    ) c ON day = c.d;

    v_result := json_build_object(
        'current_streak', v_engagement.current_streak,
        'longest_streak', v_engagement.longest_streak,
        'total_checkins', v_engagement.total_checkins,
        'badges', v_engagement.badges,
        'checkins_last_7_days', COALESCE(v_checkins_last_7_days, '[]'::json)
    );

    RETURN v_result;
END;
$$;
