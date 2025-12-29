-- ============================================
-- DADOS INICIAIS - VERSÃO COMPATÍVEL
-- Execute este arquivo no Supabase
-- ============================================

-- 1. CRIAR/ATUALIZAR PLANOS (ignora se já existir)
INSERT INTO plans (id, name, price, max_members, description)
VALUES 
  (1, 'Plano Solo', 79.90, 1, 'Acesso individual a todas as academias parceiras'),
  (2, 'Plano Família', 149.90, 4, 'Acesso para até 4 pessoas da família')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  max_members = EXCLUDED.max_members,
  description = EXCLUDED.description;

-- 2. CRIAR ACADEMIA DE TESTE (com suas coordenadas)
INSERT INTO academies (name, address, lat, long, active, description)
VALUES (
  'Academia Teste MVP 0.3',
  'Cabo Frio, RJ',
  -22.878260606151592,
  -42.04539959521476,
  TRUE,
  'Academia de teste para validação do MVP 0.3'
)
RETURNING id, name, lat, long;

-- 3. TORNAR SEU USUÁRIO ADMIN
UPDATE users 
SET role = 'admin' 
WHERE email = 'nicoolascf5@gmail.com';

-- 4. VERIFICAR SE FUNCIONOU
SELECT id, email, role FROM users WHERE role = 'admin';

-- 5. VERIFICAR ACADEMIAS
SELECT id, name, lat, long, active FROM academies ORDER BY created_at DESC LIMIT 5;

-- 6. VERIFICAR PLANOS
SELECT * FROM plans ORDER BY id;
