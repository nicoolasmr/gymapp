-- MVP 0.3 Part 2 Schema Updates: Antifraud, Push, Finance, Admin

-- 1. Add Push Token and Role to Users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'; -- 'user', 'admin'

-- 2. Add Active Status and Location to Academies
ALTER TABLE academies
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS long DOUBLE PRECISION;

-- 3. Create Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id),
    period TEXT NOT NULL, -- 'YYYY-MM'
    total_checkins INT DEFAULT 0,
    estimated_value DECIMAL(10, 2) DEFAULT 0.00,
    generated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RPC: Validate and Perform Check-in (Antifraud)
-- This function encapsulates all logic to ensure security
CREATE OR REPLACE FUNCTION perform_checkin(
    _user_id UUID,
    _academy_id UUID,
    _user_lat DOUBLE PRECISION,
    _user_long DOUBLE PRECISION
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _plan_status TEXT;
    _academy_lat DOUBLE PRECISION;
    _academy_long DOUBLE PRECISION;
    _distance DOUBLE PRECISION;
    _last_checkin TIMESTAMPTZ;
    _checkin_id UUID;
    _streak INT;
    _badge JSON;
BEGIN
    -- 1. Check User Plan Status
    SELECT status INTO _plan_status FROM memberships 
    WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;

    IF _plan_status IS NULL OR _plan_status != 'active' THEN
        RETURN json_build_object('success', FALSE, 'message', 'Plano inativo ou inexistente.');
    END IF;

    -- 2. Check Academy Active Status & Location
    SELECT active, lat, long INTO _plan_status, _academy_lat, _academy_long -- reusing _plan_status var for boolean check logic is bad practice, let's use a new var or just check directly
    FROM academies WHERE id = _academy_id;
    
    -- Re-query properly
    DECLARE
        _is_active BOOLEAN;
    BEGIN
        SELECT active, lat, long INTO _is_active, _academy_lat, _academy_long 
        FROM academies WHERE id = _academy_id;

        IF _is_active IS FALSE THEN
            RETURN json_build_object('success', FALSE, 'message', 'Academia inativa no sistema.');
        END IF;
    END;

    -- 3. Check Distance (Simple Haversine or similar approximation)
    -- 6371 km radius. 
    -- Distance in meters
    IF _academy_lat IS NOT NULL AND _academy_long IS NOT NULL THEN
        _distance := (
            6371000 * acos(
                cos(radians(_user_lat)) * cos(radians(_academy_lat)) *
                cos(radians(_academy_long) - radians(_user_long)) +
                sin(radians(_user_lat)) * sin(radians(_academy_lat))
            )
        );

        IF _distance > 300 THEN -- 300 meters tolerance
            RETURN json_build_object('success', FALSE, 'message', 'Você está muito longe da academia (' || round(_distance::numeric, 0) || 'm).');
        END IF;
    ELSE
        -- If academy has no location set, we might skip or fail. For MVP, let's fail safe or allow? 
        -- Let's allow but warn, or fail. User said "Checar posição". So we must have academy location.
        -- If null, assume it's a test academy without location, maybe allow? 
        -- Let's fail to enforce data quality.
        RETURN json_build_object('success', FALSE, 'message', 'Localização da academia não cadastrada.');
    END IF;

    -- 4. Check Daily Limit (1 check-in per day)
    SELECT created_at INTO _last_checkin FROM checkins 
    WHERE user_id = _user_id 
    AND created_at > current_date::timestamp 
    LIMIT 1;

    IF _last_checkin IS NOT NULL THEN
        RETURN json_build_object('success', FALSE, 'message', 'Você já fez check-in hoje.');
    END IF;

    -- 5. Perform Check-in
    INSERT INTO checkins (user_id, academy_id) 
    VALUES (_user_id, _academy_id)
    RETURNING id INTO _checkin_id;

    -- 6. Calculate Streak & Badges (Simplified)
    -- (Reuse logic from getStats or do it here)
    -- For now, just return success. The app will fetch updated stats.
    
    RETURN json_build_object(
        'success', TRUE, 
        'message', 'Check-in realizado com sucesso!',
        'checkin_id', _checkin_id
    );
END;
$$;

-- 5. Function to get Admin Stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _total_users INT;
    _total_academies INT;
    _total_checkins INT;
    _active_subs INT;
BEGIN
    SELECT count(*) INTO _total_users FROM users;
    SELECT count(*) INTO _total_academies FROM academies;
    SELECT count(*) INTO _total_checkins FROM checkins;
    SELECT count(*) INTO _active_subs FROM memberships WHERE status = 'active';

    RETURN json_build_object(
        'total_users', _total_users,
        'total_academies', _total_academies,
        'total_checkins', _total_checkins,
        'active_subs', _active_subs
    );
END;
$$;
