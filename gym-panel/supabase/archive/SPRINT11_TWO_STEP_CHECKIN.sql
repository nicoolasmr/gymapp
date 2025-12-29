-- ============================================
-- 🚀 SPRINT 11: TWO-STEP CHECK-IN (GEOLOCATION)
-- ============================================

-- 1. Add status and validation fields to checkins table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkins' AND column_name = 'status') THEN
        ALTER TABLE checkins ADD COLUMN status TEXT DEFAULT 'validated'; -- Default to validated so old checkins work
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkins' AND column_name = 'validated_at') THEN
        ALTER TABLE checkins ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Add latitude and longitude to academies table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'latitude') THEN
        ALTER TABLE academies ADD COLUMN latitude DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'longitude') THEN
        ALTER TABLE academies ADD COLUMN longitude DOUBLE PRECISION;
    END IF;
END $$;

-- 3. Seed dummy coordinates for existing academies (Example: Central São Paulo)
-- We will use a random offset to make them slightly different
UPDATE academies
SET 
    latitude = -23.550520 + (random() * 0.01 - 0.005),
    longitude = -46.633308 + (random() * 0.01 - 0.005)
WHERE latitude IS NULL;

-- 4. Function to validate check-in
CREATE OR REPLACE FUNCTION validate_checkin(p_checkin_id UUID, p_user_id UUID, p_lat DOUBLE PRECISION, p_long DOUBLE PRECISION)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_checkin RECORD;
    v_academy RECORD;
    v_distance DOUBLE PRECISION;
    v_earth_radius_km DOUBLE PRECISION := 6371;
    v_dlat DOUBLE PRECISION;
    v_dlon DOUBLE PRECISION;
    v_a DOUBLE PRECISION;
    v_c DOUBLE PRECISION;
BEGIN
    -- Get checkin
    SELECT * INTO v_checkin FROM checkins WHERE id = p_checkin_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Check-in not found or not owned by user';
    END IF;

    IF v_checkin.status = 'validated' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already validated');
    END IF;

    -- Get academy location
    SELECT * INTO v_academy FROM academies WHERE id = v_checkin.academy_id;

    -- Calculate distance (Haversine formula) in Meters
    -- This is a simple SQL implementation of Haversine
    v_dlat := radians(v_academy.latitude - p_lat);
    v_dlon := radians(v_academy.longitude - p_long);
    v_a := sin(v_dlat/2) * sin(v_dlat/2) +
           cos(radians(p_lat)) * cos(radians(v_academy.latitude)) *
           sin(v_dlon/2) * sin(v_dlon/2);
    v_c := 2 * atan2(sqrt(v_a), sqrt(1-v_a));
    v_distance := v_earth_radius_km * v_c * 1000; -- Result in meters

    -- Validation Threshold (e.g., 200 meters)
    IF v_distance > 200 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Too far from academy', 
            'distance_meters', v_distance,
            'allowed_distance', 200
        );
    END IF;

    -- Update checkin status
    UPDATE checkins 
    SET status = 'validated', validated_at = NOW()
    WHERE id = p_checkin_id;

    RETURN jsonb_build_object('success', true, 'message', 'Check-in validated successfully', 'distance', v_distance);
END;
$$;

GRANT EXECUTE ON FUNCTION validate_checkin TO authenticated;
