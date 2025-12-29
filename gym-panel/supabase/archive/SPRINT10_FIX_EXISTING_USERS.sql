-- ============================================
-- 🛠️ FIX: CRIAR PERFIS PARA USUÁRIOS EXISTENTES
-- ============================================

INSERT INTO user_profiles_public (user_id, username)
SELECT 
    id, 
    LOWER(SPLIT_PART(email, '@', 1)) || '_' || SUBSTRING(id::TEXT, 1, 4)
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Garantir que todos tenham username
UPDATE user_profiles_public
SET username = 'user_' || SUBSTRING(user_id::TEXT, 1, 8)
WHERE username IS NULL;

-- ============================================
-- ✅ PRONTO!
-- ============================================
