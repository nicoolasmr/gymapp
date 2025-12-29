-- MVP 0.3 Schema Updates: Family Plan & Invites

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

-- 3. RPC Functions for Logic

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
  -- Check if user has family plan (plan_id = 2) and is active
  SELECT plan_id INTO _plan_id FROM memberships 
  WHERE user_id = _inviter_id AND status = 'active' 
  ORDER BY created_at DESC LIMIT 1;

  IF _plan_id IS NULL OR _plan_id != 2 THEN
    RAISE EXCEPTION 'User does not have an active Family Plan';
  END IF;

  -- Check limits (Owner + Members + Pending Invites <= 4)
  -- 1. Count current members (excluding owner)
  SELECT count(*) INTO _member_count FROM users WHERE family_owner_id = _inviter_id;
  
  -- 2. Count pending invites
  SELECT count(*) INTO _invite_count FROM family_invites 
  WHERE inviter_id = _inviter_id AND status = 'pending' AND expires_at > now();

  IF (_member_count + _invite_count + 1) >= 4 THEN -- +1 for the owner
    RAISE EXCEPTION 'Family plan limit reached (4 members)';
  END IF;

  -- Generate Token
  _token := encode(gen_random_bytes(16), 'hex');

  -- Insert Invite
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
  -- Get invite
  SELECT * INTO _invite FROM family_invites 
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Check if user is already in a family
  SELECT family_owner_id INTO _current_owner FROM users WHERE id = _user_id;
  IF _current_owner IS NOT NULL THEN
    RAISE EXCEPTION 'User is already in a family plan';
  END IF;
  
  -- Check if user is the inviter (cannot invite self)
  IF _invite.inviter_id = _user_id THEN
      RAISE EXCEPTION 'Cannot accept your own invite';
  END IF;

  -- Link user
  UPDATE users SET family_owner_id = _invite.inviter_id WHERE id = _user_id;

  -- Mark invite accepted
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
  -- Verify ownership
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
  -- Check if user is an owner
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

  -- Get Members
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

  -- Get Pending Invites (only if requester is owner)
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
