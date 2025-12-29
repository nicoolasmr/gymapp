-- ============================================
-- 🔧 FIX: AVATAR UPLOAD & STORAGE POLICIES
-- ============================================

-- 1. Create 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects (Usually already enabled, skipping explicit command to avoid permissions error)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow Public Read (Anyone can view avatars)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 4. Policy: Allow Authenticated Insert (Users can upload their own avatar)
-- We enforce that the file path starts with their user_id to prevent overwriting others
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    -- Relaxing path check slightly to avoid potential array issues if path is simple
    -- Ideally: (storage.foldername(name))[1] = auth.uid()::text
    AND name LIKE auth.uid()::text || '/%'
);

-- 5. Policy: Allow Authenticated Update (Users can update their own avatar)
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND name LIKE auth.uid()::text || '/%'
);

-- 6. Policy: Allow Authenticated Delete
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND name LIKE auth.uid()::text || '/%'
);

-- Note: The frontend code does: userService.updateUserProfile(user.id, { avatar_url: publicUrl });
-- Ensure users table is updatable by the user themselves.

DROP POLICY IF EXISTS "Users can update own profile" ON auth.users;
-- Actually, we can't easily change policies on auth.users directly or it's risky.
-- Usually we update a 'public.profiles' or 'public.users' table.
-- Assuming 'users' refers to a public table created in previous sprints.
-- Let's check permissions on the 'users' table if it exists in public schema.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Ensure RLS is enabled
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Start fresh with update policy
        DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
        
        CREATE POLICY "Users can update own profile"
        ON public.users FOR UPDATE
        TO authenticated
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid());
        
        -- Ensure select policy
        DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
        CREATE POLICY "Users can view own profile"
        ON public.users FOR SELECT
        TO authenticated
        USING (true); -- Or id = auth.uid() depending on privacy, but usually public profiles are viewable
    END IF;
END $$;
