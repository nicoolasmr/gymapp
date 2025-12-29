-- FIX: ALL ISSUES (RECURSION + BROKEN URLS)
-- Run this in Supabase SQL Editor

-- 1. FIX INFINITE RECURSION (Policy Loop)
-- We drop ALL potential conflicting policies on related tables
DROP POLICY IF EXISTS "Enable read access for all" ON competition_participants;
DROP POLICY IF EXISTS "Competition participants view" ON competition_participants;
DROP POLICY IF EXISTS "Participants can view other participants" ON competition_participants;
DROP POLICY IF EXISTS "View competition participants" ON competition_participants;
DROP POLICY IF EXISTS "View participants" ON competition_participants;
DROP POLICY IF EXISTS "Authenticated users can view participants" ON competition_participants;
DROP POLICY IF EXISTS "View competitions" ON competitions;
DROP POLICY IF EXISTS "Competitions view" ON competitions;

-- Create simple, non-recursive policies
CREATE POLICY "View participants"
ON competition_participants FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "View competitions"
ON competitions FOR SELECT
TO authenticated
USING (true);


-- 2. FIX BROKEN URLs IN DATABASE
-- The URL 'teste.ctesdaee.tesfte.com' is likely in the database data, not the code.
-- We will replace it with a valid Unsplash image.

UPDATE academies
SET logo_url = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
WHERE logo_url LIKE '%teste.ctesdaee%';

UPDATE user_profiles_public
SET avatar_url = NULL
WHERE avatar_url LIKE '%teste.ctesdaee%' OR avatar_url LIKE '%via.placeholder%';

-- 3. FIX MEMBERSHIP 406 NOT ACCEPTABLE
-- This often happens if 'get_user_progress' returns void or wrong type, or RLS is strict.
-- We ensure the function works and returns JSON.
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
    SELECT * INTO v_engagement FROM user_engagement WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        INSERT INTO user_engagement (user_id) VALUES (p_user_id) RETURNING * INTO v_engagement;
    END IF;

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
