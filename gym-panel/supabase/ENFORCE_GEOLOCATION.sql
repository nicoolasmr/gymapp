-- ============================================
-- 📍 ENFORCE GEOLOCATION (200 METERS)
-- ============================================

-- Execute este script para ativar a verificação REAL de 200 metros.

CREATE OR REPLACE FUNCTION validate_checkin(p_checkin_id UUID, p_user_id UUID, p_lat DOUBLE PRECISION, p_long DOUBLE PRECISION)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_checkin RECORD;
    v_academy RECORD;
    v_distance DOUBLE PRECISION;
    -- Radius of Earth in KM
    v_earth_radius_km DOUBLE PRECISION := 6371;
    v_dlat DOUBLE PRECISION;
    v_dlon DOUBLE PRECISION;
    v_a DOUBLE PRECISION;
    v_c DOUBLE PRECISION;
BEGIN
    -- 1. Get checkin details
    SELECT * INTO v_checkin FROM checkins WHERE id = p_checkin_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Check-in não encontrado.';
    END IF;

    IF v_checkin.status = 'validated' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Check-in já validado anteriormente.');
    END IF;

    -- 2. Get academy location
    SELECT * INTO v_academy FROM academies WHERE id = v_checkin.academy_id;

    -- 3. Calculate Haversine Distance
    v_dlat := radians(v_academy.latitude - p_lat);
    v_dlon := radians(v_academy.longitude - p_long);
    v_a := sin(v_dlat/2) * sin(v_dlat/2) +
           cos(radians(p_lat)) * cos(radians(v_academy.latitude)) *
           sin(v_dlon/2) * sin(v_dlon/2);
    v_c := 2 * atan2(sqrt(v_a), sqrt(1-v_a));
    v_distance := v_earth_radius_km * v_c * 1000; -- Convert to Meters

    -- 4. Check Distance (Strict 200 meters)
    IF v_distance > 200 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Longe demais: Você está a ' || round(v_distance::numeric, 0) || 'm da academia (Máx: 200m).',
            'distance', v_distance
        );
    END IF;

    -- 5. Success! Update status
    UPDATE checkins 
    SET status = 'validated', validated_at = NOW()
    WHERE id = p_checkin_id;

    RETURN jsonb_build_object('success', true, 'message', 'Check-in validado com sucesso!', 'distance', v_distance);
END;
$$;
