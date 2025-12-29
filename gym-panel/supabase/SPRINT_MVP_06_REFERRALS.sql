-- ==============================================================================
-- 🤝 REFERRAL SYSTEM LIFT-OFF
-- ==============================================================================

-- Helper: Generate random string safe for codes
CREATE OR REPLACE FUNCTION generate_random_code_suffix() RETURNS TEXT AS $$
BEGIN
    RETURN substring(md5(random()::text) from 1 for 4);
END;
$$ LANGUAGE plpgsql;

-- CRITICAL RPC: Get or Create Code
CREATE OR REPLACE FUNCTION get_or_create_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_code TEXT;
    v_username TEXT;
BEGIN
    -- 1. Check if exists
    SELECT code INTO v_code FROM referral_codes WHERE user_id = v_user_id;
    IF v_code IS NOT NULL THEN
        RETURN v_code;
    END IF;

    -- 2. Generate new code based on User metadata or Random
    -- Try to get name from raw_user_meta_data
    SELECT COALESCE(raw_user_meta_data->>'full_name', 'USER') INTO v_username
    FROM auth.users WHERE id = v_user_id;

    -- Clean username (upcase, remove spaces, limit 5 chars)
    v_username := UPPER(regexp_replace(v_username, '\s', '', 'g'));
    v_username := substring(v_username from 1 for 5);
    
    -- Add random suffix to ensure uniqueness
    v_code := v_username || generate_random_code_suffix();

    -- 3. Insert and handle collision (retry once if unlucky)
    BEGIN
        INSERT INTO referral_codes (user_id, code) VALUES (v_user_id, v_code);
    EXCEPTION WHEN unique_violation THEN
        -- Retry with new suffix
        v_code := v_username || generate_random_code_suffix();
        INSERT INTO referral_codes (user_id, code) VALUES (v_user_id, v_code);
    END;

    RETURN v_code;
END;
$$;

-- RPC: Validate Referral Code (Used during Signup)
CREATE OR REPLACE FUNCTION validate_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_id UUID;
BEGIN
    SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = UPPER(p_code);
    
    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    -- Don't allow referring yourself
    IF v_referrer_id = auth.uid() THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'self_referral');
    END IF;

    RETURN jsonb_build_object('valid', true, 'referrer_id', v_referrer_id);
END;
$$;
