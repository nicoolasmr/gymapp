-- ============================================
-- 🛠️ FIX CHECKIN LOGIC AND DASHBOARD CONNECTION
-- ============================================

-- 1. Ensure Checkins Table Exists
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    academy_id UUID NOT NULL REFERENCES public.academies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'validated' CHECK (status IN ('pending', 'validated', 'rejected')),
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies
-- Allow users to view their own checkins
DROP POLICY IF EXISTS "Users can view own checkins" ON public.checkins;
CREATE POLICY "Users can view own checkins" ON public.checkins
    FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view all checkins
DROP POLICY IF EXISTS "Admins can view all checkins" ON public.checkins;
CREATE POLICY "Admins can view all checkins" ON public.checkins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Allow academy owners to view checkins for their academy
DROP POLICY IF EXISTS "Academy owners can view their academy checkins" ON public.checkins;
CREATE POLICY "Academy owners can view their academy checkins" ON public.checkins
    FOR SELECT USING (
        academy_id IN (
            SELECT id FROM public.academies WHERE owner_id = auth.uid()
        )
    );

-- Allow authenticated users to insert checkins (via RPC usually, but good to have)
DROP POLICY IF EXISTS "Users can insert checkins" ON public.checkins;
CREATE POLICY "Users can insert checkins" ON public.checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Create/Update perform_checkin RPC function
DROP FUNCTION IF EXISTS perform_checkin(uuid, uuid, double precision, double precision) CASCADE;

CREATE OR REPLACE FUNCTION perform_checkin(
    _user_id UUID,
    _academy_id UUID,
    _user_lat DOUBLE PRECISION,
    _user_long DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_checkin_id UUID;
    v_academy_name TEXT;
    v_user_exists BOOLEAN;
BEGIN
    -- Verify if user exists
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = _user_id) INTO v_user_exists;
    IF NOT v_user_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
    END IF;

    -- Insert check-in
    INSERT INTO public.checkins (user_id, academy_id, status, created_at, validated_at)
    VALUES (_user_id, _academy_id, 'validated', NOW(), NOW())
    RETURNING id INTO v_checkin_id;

    -- Fetch academy name
    SELECT name INTO v_academy_name FROM public.academies WHERE id = _academy_id;

    -- Auto-post to Social Feed (Social Fitness Integration)
    INSERT INTO public.social_feed (user_id, checkin_id, event_type, message, created_at)
    VALUES (_user_id, v_checkin_id, 'checkin', 'Fez um check-in em ' || v_academy_name, NOW());

    -- Optional: Update user's last coordinates or stats here if needed

    RETURN jsonb_build_object(
        'success', true,
        'checkin_id', v_checkin_id,
        'academy_name', v_academy_name,
        'message', 'Check-in realizado com sucesso!'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. Create/Update get_my_academy RPC function (Vital for Dashboard)
DROP FUNCTION IF EXISTS get_my_academy() CASCADE;

CREATE OR REPLACE FUNCTION get_my_academy()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT row_to_json(a)
  FROM academies a
  WHERE a.owner_id = auth.uid()
  LIMIT 1;
$$;

-- Grant permissions
GRANT ALL ON TABLE public.checkins TO authenticated;
GRANT ALL ON TABLE public.checkins TO service_role;
GRANT EXECUTE ON FUNCTION perform_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_academy TO authenticated;
