-- ============================================
-- MVP 0.3 - MIGRAÇÃO COMPLETA CONSOLIDADA
-- Execute este arquivo completo no Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTE 1: SISTEMA DE CONVITES FAMÍLIA
-- ============================================

-- 1. Add family_owner_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS family_owner_id UUID REFERENCES users(id);

-- 2. Create family_invites table
CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Function: Create Invite
CREATE OR REPLACE FUNCTION create_family_invite(_inviter_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _token TEXT;
  _plan_id INT;
  _member_count INT;
  _invite_count INT;
BEGIN
  SELECT plan_id INTO _plan_id FROM memberships 
  WHERE user_id = _inviter_id AND status = 'active' 
  ORDER BY created_at DESC LIMIT 1;

  IF _plan_id IS NULL OR _plan_id != 2 THEN
    RAISE EXCEPTION 'User does not have an active Family Plan';
  END IF;

  SELECT count(*) INTO _member_count FROM users WHERE family_owner_id = _inviter_id;
  SELECT count(*) INTO _invite_count FROM family_invites 
  WHERE inviter_id = _inviter_id AND status = 'pending' AND expires_at > now();

  IF (_member_count + _invite_count + 1) >= 4 THEN
    RAISE EXCEPTION 'Family plan limit reached (4 members)';
  END IF;

  _token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO family_invites (inviter_id, token, expires_at)
  VALUES (_inviter_id, _token, now() + INTERVAL '72 hours');

  RETURN _token;
END;
$$;

-- Function: Accept Invite
CREATE OR REPLACE FUNCTION accept_family_invite(_token TEXT, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _invite RECORD;
  _current_owner UUID;
BEGIN
  SELECT * INTO _invite FROM family_invites 
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT family_owner_id INTO _current_owner FROM users WHERE id = _user_id;
  IF _current_owner IS NOT NULL THEN
    RAISE EXCEPTION 'User is already in a family plan';
  END IF;
  
  IF _invite.inviter_id = _user_id THEN
      RAISE EXCEPTION 'Cannot accept your own invite';
  END IF;

  UPDATE users SET family_owner_id = _invite.inviter_id WHERE id = _user_id;
  UPDATE family_invites SET status = 'accepted' WHERE id = _invite.id;

  RETURN TRUE;
END;
$$;

-- Function: Remove Member
CREATE OR REPLACE FUNCTION remove_family_member(_owner_id UUID, _member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users SET family_owner_id = NULL 
  WHERE id = _member_id AND family_owner_id = _owner_id;

  IF found THEN
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Member not found or not in your family';
  END IF;
END;
$$;

-- Function: Get Family Details
CREATE OR REPLACE FUNCTION get_family_details(_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _is_owner BOOLEAN;
  _owner_id UUID;
  _members JSON;
  _invites JSON;
BEGIN
  SELECT exists(
    SELECT 1 FROM memberships 
    WHERE user_id = _user_id AND plan_id = 2 AND status = 'active'
  ) INTO _is_owner;

  IF _is_owner THEN
    _owner_id := _user_id;
  ELSE
    SELECT family_owner_id INTO _owner_id FROM users WHERE id = _user_id;
  END IF;

  IF _owner_id IS NULL THEN
    RETURN json_build_object('has_family', FALSE);
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', u.id,
      'full_name', u.full_name,
      'email', u.email,
      'avatar_url', u.avatar_url,
      'role', CASE WHEN u.id = _owner_id THEN 'owner' ELSE 'member' END
    )
  ) INTO _members
  FROM users u
  WHERE u.id = _owner_id OR u.family_owner_id = _owner_id;

  IF _user_id = _owner_id THEN
    SELECT json_agg(
      json_build_object(
        'id', i.id,
        'token', i.token,
        'created_at', i.created_at,
        'expires_at', i.expires_at
      )
    ) INTO _invites
    FROM family_invites i
    WHERE i.inviter_id = _owner_id AND i.status = 'pending' AND i.expires_at > now();
  END IF;

  RETURN json_build_object(
    'has_family', TRUE,
    'is_owner', (_user_id = _owner_id),
    'owner_id', _owner_id,
    'members', coalesce(_members, '[]'::json),
    'invites', coalesce(_invites, '[]'::json)
  );
END;
$$;

-- ============================================
-- PARTE 2: ANTIFRAUDE, PUSH, PAYOUTS
-- ============================================

-- Add Push Token and Role to Users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Add Active Status and Location to Academies
ALTER TABLE academies
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS long DOUBLE PRECISION;

-- Create Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID REFERENCES academies(id),
    period TEXT NOT NULL,
    total_checkins INT DEFAULT 0,
    estimated_value DECIMAL(10, 2) DEFAULT 0.00,
    generated_at TIMESTAMPTZ DEFAULT now()
);

-- RPC: Validate and Perform Check-in (Antifraud)
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
    _is_active BOOLEAN;
    _distance DOUBLE PRECISION;
    _last_checkin TIMESTAMPTZ;
    _checkin_id UUID;
BEGIN
    -- 1. Check User Plan Status
    SELECT status INTO _plan_status FROM memberships 
    WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;

    IF _plan_status IS NULL OR _plan_status != 'active' THEN
        RETURN json_build_object('success', FALSE, 'message', 'Plano inativo ou inexistente.');
    END IF;

    -- 2. Check Academy Active Status & Location
    SELECT active, lat, long INTO _is_active, _academy_lat, _academy_long 
    FROM academies WHERE id = _academy_id;

    IF _is_active IS FALSE THEN
        RETURN json_build_object('success', FALSE, 'message', 'Academia inativa no sistema.');
    END IF;

    -- 3. Check Distance (Haversine formula)
    IF _academy_lat IS NOT NULL AND _academy_long IS NOT NULL THEN
        _distance := (
            6371000 * acos(
                cos(radians(_user_lat)) * cos(radians(_academy_lat)) *
                cos(radians(_academy_long) - radians(_user_long)) +
                sin(radians(_user_lat)) * sin(radians(_academy_lat))
            )
        );

        IF _distance > 300 THEN
            RETURN json_build_object('success', FALSE, 'message', 'Você está muito longe da academia (' || round(_distance::numeric, 0) || 'm).');
        END IF;
    ELSE
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
    
    RETURN json_build_object(
        'success', TRUE, 
        'message', 'Check-in realizado com sucesso!',
        'checkin_id', _checkin_id
    );
END;
$$;

-- Function to get Admin Stats
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

-- ============================================
-- PARTE 3: NOTIFICATIONS, SOFT DELETE, REPORTING
-- ============================================

-- Notifications Log Table
CREATE TABLE IF NOT EXISTS notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now(),
    success BOOLEAN DEFAULT TRUE
);

-- Soft Delete for Users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- View for Finance: Monthly Stats
CREATE OR REPLACE VIEW monthly_academy_stats AS
SELECT 
    academy_id,
    to_char(created_at, 'YYYY-MM') as month,
    count(*) as total_checkins,
    count(*) * 15.00 as estimated_value
FROM checkins
GROUP BY academy_id, to_char(created_at, 'YYYY-MM');

-- RPC: Soft Delete User
CREATE OR REPLACE FUNCTION soft_delete_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users SET deleted_at = now() WHERE id = _user_id;
    UPDATE memberships SET status = 'canceled' WHERE user_id = _user_id AND status = 'active';
    RETURN TRUE;
END;
$$;

-- RPC: Get Frequent Users
CREATE OR REPLACE FUNCTION get_frequent_users(_academy_id UUID, _limit INT DEFAULT 5)
RETURNS TABLE (
    user_name TEXT,
    checkin_count BIGINT,
    last_checkin TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.full_name,
        count(c.id) as checkin_count,
        max(c.created_at) as last_checkin
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.academy_id = _academy_id
    AND c.created_at > (now() - INTERVAL '30 days')
    GROUP BY u.id, u.full_name
    ORDER BY checkin_count DESC
    LIMIT _limit;
END;
$$;

-- RPC: Get Daily Check-ins
CREATE OR REPLACE FUNCTION get_daily_checkins(_academy_id UUID DEFAULT NULL)
RETURNS TABLE (
    day DATE,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF _academy_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            created_at::date as day,
            count(*) as count
        FROM checkins
        WHERE academy_id = _academy_id
        AND created_at > (now() - INTERVAL '30 days')
        GROUP BY created_at::date
        ORDER BY day ASC;
    ELSE
        RETURN QUERY
        SELECT 
            created_at::date as day,
            count(*) as count
        FROM checkins
        WHERE created_at > (now() - INTERVAL '30 days')
        GROUP BY created_at::date
        ORDER BY day ASC;
    END IF;
END;
$$;

-- ============================================
-- CONCLUÍDO! Próximo passo: Dados iniciais
-- ============================================
