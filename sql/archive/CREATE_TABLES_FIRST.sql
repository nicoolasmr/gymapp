-- ============================================
-- VERIFICAÇÃO E CRIAÇÃO DE TABELAS FALTANTES
-- Execute este arquivo PRIMEIRO
-- ============================================

-- 1. CRIAR TABELA PLANS (se não existir)
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    max_members INT DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CRIAR TABELA ACADEMIES (se não existir)
CREATE TABLE IF NOT EXISTS academies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    lat DOUBLE PRECISION,
    long DOUBLE PRECISION,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CRIAR TABELA USERS (se não existir)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    family_owner_id UUID REFERENCES users(id),
    push_token TEXT,
    role TEXT DEFAULT 'user',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CRIAR TABELA MEMBERSHIPS (se não existir)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plan_id INT REFERENCES plans(id),
    status TEXT DEFAULT 'active',
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CRIAR TABELA CHECKINS (se não existir)
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    academy_id UUID REFERENCES academies(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INSERIR PLANOS
INSERT INTO plans (id, name, price, max_members, description)
VALUES 
  (1, 'Plano Solo', 79.90, 1, 'Acesso individual a todas as academias parceiras'),
  (2, 'Plano Família', 149.90, 4, 'Acesso para até 4 pessoas da família')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  max_members = EXCLUDED.max_members,
  description = EXCLUDED.description;

-- 7. INSERIR ACADEMIA DE TESTE
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

-- 8. VERIFICAR RESULTADOS
SELECT 'Planos criados:' as info;
SELECT * FROM plans;

SELECT 'Academias criadas:' as info;
SELECT id, name, lat, long FROM academies;
