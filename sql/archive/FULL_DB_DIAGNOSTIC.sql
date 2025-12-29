-- DIAGNOSTICO COMPLETO DO BANCO DE DADOS
-- 1. Verificar Colunas da Tabela Academies
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'academies'
ORDER BY column_name;

-- 2. Verificar Função get_my_academy
SELECT routine_name, routine_definition, return_type
FROM information_schema.routines
WHERE routine_name = 'get_my_academy';

-- 3. Verificar Políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'academies';

-- 4. Verificar se o usuário atual tem academia vinculada
SELECT * FROM academies WHERE owner_id = auth.uid();
