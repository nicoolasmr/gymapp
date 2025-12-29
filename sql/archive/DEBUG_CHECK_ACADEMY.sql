-- Teste para verificar se a função get_my_academy está retornando dados
-- Como não podemos simular auth.uid() facilmente aqui sem login, vamos checar se a função existe e se a tabela tem dados.

SELECT count(*) FROM academies;

SELECT id, name, owner_id FROM academies LIMIT 5;

-- Verificar se o usuário atual (que vamos simular) tem academia
-- O usuário de teste é 'nicoolascf5@gmail.com'
SELECT id FROM users WHERE email = 'nicoolascf5@gmail.com';

-- Se tivermos o ID, podemos checar se bate com algum owner_id
