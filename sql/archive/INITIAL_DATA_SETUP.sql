-- ============================================
-- DADOS INICIAIS E CONFIGURAÇÃO
-- Execute APÓS a migração completa
-- ============================================

-- 1. CRIAR PLANOS (se ainda não existirem)
INSERT INTO plans (id, name, price, max_members, description)
VALUES 
  (1, 'Plano Solo', 79.90, 1, 'Acesso individual a todas as academias parceiras'),
  (2, 'Plano Família', 149.90, 4, 'Acesso para até 4 pessoas da família')
ON CONFLICT (id) DO NOTHING;

-- 2. CRIAR ACADEMIA DE TESTE
-- IMPORTANTE: Ajuste lat/long para sua localização atual!
-- Use Google Maps para pegar as coordenadas exatas

INSERT INTO academies (name, address, lat, long, active, description)
VALUES (
  'Academia Teste MVP',
  'Rua Exemplo, 123 - São Paulo, SP',
 -22.878260606151592,  -- ⚠️ AJUSTE PARA SUA LOCALIZAÇÃO
  -42.04539959521476,  -- ⚠️ AJUSTE PARA SUA LOCALIZAÇÃO
  TRUE,
  'Academia de teste para validação do MVP 0.3'
)
RETURNING id, name, lat, long;

-- 3. TORNAR SEU USUÁRIO ADMIN
-- ⚠️ SUBSTITUA pelo seu email cadastrado
UPDATE users 
SET role = 'admin' 
WHERE email = 'nicoolascf5@gmail.com';  -- ⚠️ ALTERE AQUI

-- Verificar se funcionou:
SELECT id, email, role FROM users WHERE role = 'admin';

-- 4. VERIFICAR ESTRUTURA CRIADA
-- Execute estas queries para validar:

-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('family_invites', 'notifications_log', 'payouts')
ORDER BY table_name;

-- Verificar colunas adicionadas em users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('family_owner_id', 'push_token', 'role', 'deleted_at')
ORDER BY column_name;

-- Verificar colunas adicionadas em academies
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'academies' 
AND column_name IN ('active', 'lat', 'long')
ORDER BY column_name;

-- Verificar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name LIKE '%family%' OR routine_name LIKE '%checkin%' OR routine_name LIKE '%admin%'
ORDER BY routine_name;

-- 5. DADOS OPCIONAIS PARA TESTES

-- Criar mais academias de teste (opcional)
/*
INSERT INTO academies (name, address, lat, long, active)
VALUES 
  ('SmartFit Centro', 'Av. Paulista, 1000', -23.5629, -46.6544, TRUE),
  ('Bio Ritmo Vila Mariana', 'Rua Domingos de Morais, 2000', -23.5880, -46.6360, TRUE),
  ('Bodytech Itaim', 'Av. Brigadeiro Faria Lima, 3000', -23.5847, -46.6869, TRUE);
*/

-- ============================================
-- PRÓXIMOS PASSOS
-- ============================================

/*
1. ✅ Migração executada
2. ✅ Dados iniciais criados
3. ⏭️ Testar no app mobile
4. ⏭️ Testar no painel web
5. ⏭️ Validar todos os fluxos

Ver SETUP_GUIDE.md para instruções detalhadas de teste.
*/
