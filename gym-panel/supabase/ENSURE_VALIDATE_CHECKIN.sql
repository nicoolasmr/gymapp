-- ============================================
-- 🛡️ GARANTIR FUNÇÃO DE VALIDAÇÃO (TWO-STEP)
-- ============================================
-- Como o app usa o fluxo de 2 etapas (Reserva -> Validação),
-- precisamos garantir que a função validate_checkin existe e está atualizada.

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
    v_dlat := radians(v_academy.latitude - p_lat);
    v_dlon := radians(v_academy.longitude - p_long);
    v_a := sin(v_dlat/2) * sin(v_dlat/2) +
           cos(radians(p_lat)) * cos(radians(v_academy.latitude)) *
           sin(v_dlon/2) * sin(v_dlon/2);
    v_c := 2 * atan2(sqrt(v_a), sqrt(1-v_a));
    v_distance := v_earth_radius_km * v_c * 1000; -- Result in meters

    -- Validation Threshold (200 meters)
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

    -- 🚀 TRIGGER DE ENGAJAMENTO (GAMIFICATION) DEVE OCORRER AQUI SE NÃO FOI NO INSERT
    -- (Opcional: refinar lógica de gamificação depois)

    RETURN jsonb_build_object('success', true, 'message', 'Check-in validated successfully', 'distance', v_distance);
END;
$$;

GRANT EXECUTE ON FUNCTION validate_checkin TO authenticated;
