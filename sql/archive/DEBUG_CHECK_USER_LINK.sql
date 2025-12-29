-- Verificando o usuário e a academia
-- 1. Pegar o ID do usuário pelo email
WITH target_user AS (
    SELECT id, email, role FROM users WHERE email = 'nicoolascf5@gmail.com'
)
SELECT 
    u.id as user_id, 
    u.email, 
    u.role,
    a.id as academy_id, 
    a.name as academy_name, 
    a.owner_id as academy_owner_id
FROM target_user u
LEFT JOIN academies a ON a.owner_id = u.id;

-- 2. Listar todas as academias para ver se tem alguma 'orfã' ou com outro dono
SELECT id, name, owner_id FROM academies;
