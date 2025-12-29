-- Verificar e corrigir role do usuário admin
-- Execute este script no Supabase SQL Editor

-- 1. Ver todos os usuários e suas roles
SELECT id, email, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- 2. Atualizar seu usuário para admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'nicoolascf5@gmail.com';

-- 3. Verificar se funcionou
SELECT id, email, role 
FROM users 
WHERE email = 'nicoolascf5@gmail.com';

-- 4. Se não aparecer nada acima, significa que o usuário não está na tabela users
-- Nesse caso, precisamos inserir manualmente:
-- Primeiro, pegue o ID do usuário no Supabase Authentication
-- Depois execute (substitua o UUID pelo ID real):

-- INSERT INTO users (id, email, role, full_name)
-- VALUES (
--   'cole-o-uuid-aqui',  -- UUID do usuário do Supabase Auth
--   'nicoolascf5@gmail.com',
--   'admin',
--   'Nicolas'
-- );
