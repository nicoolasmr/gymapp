# 📋 TABELAS DO SUPABASE - CHECKLIST COMPLETO

## 🎯 COMO USAR ESTE DOCUMENTO

1. Acesse o **Supabase Dashboard** → **SQL Editor**
2. Abra o arquivo `SUPABASE_SCHEMA_FINAL_CLEAN.sql`
3. Execute TODO o conteúdo
4. Use este checklist para verificar se tudo foi criado

---

## ✅ CHECKLIST DE TABELAS (11 tabelas)

### 1. ☐ `public.users`
**Propósito:** Dados dos usuários (estende auth.users)

**Colunas principais:**
- `id` (UUID, PK, FK para auth.users)
- `email` (TEXT, UNIQUE)
- `full_name` (TEXT)
- `phone` (TEXT)
- `birth_date` (DATE)
- `avatar_url` (TEXT)
- `role` (TEXT: 'user', 'partner', 'admin')
- `push_token` (TEXT)
- `referral_code` (TEXT, UNIQUE)
- `referred_by` (UUID, FK para users)

**Verificar:**
```sql
SELECT * FROM public.users LIMIT 5;
```

---

### 2. ☐ `public.plans`
**Propósito:** Planos de assinatura (Solo/Família)

**Colunas principais:**
- `id` (SERIAL, PK)
- `name` (TEXT)
- `slug` (TEXT, UNIQUE)
- `price` (DECIMAL)
- `max_members` (INT)
- `description` (TEXT)
- `stripe_price_id` (TEXT)
- `active` (BOOLEAN)

**Verificar:**
```sql
SELECT * FROM public.plans;
-- Deve retornar 2 planos: Solo (R$ 99) e Família (R$ 149)
```

---

### 3. ☐ `public.academies`
**Propósito:** Cadastro de academias parceiras

**Colunas principais:**
- `id` (UUID, PK)
- `name` (TEXT)
- `slug` (TEXT, UNIQUE)
- `description` (TEXT)
- `modality` (TEXT: gym_standard, crossfit, martial_arts, etc.)
- `address` (JSONB)
- `location` (GEOGRAPHY)
- `logo_url` (TEXT)
- `photos` (TEXT[])
- `amenities` (TEXT[])
- `rules` (TEXT[])
- `opening_hours` (JSONB)
- `contact` (JSONB)
- `owner_id` (UUID, FK para users)
- `status` (TEXT: pending, active, inactive, rejected)

**Verificar:**
```sql
SELECT id, name, modality, status FROM public.academies LIMIT 5;
```

---

### 4. ☐ `public.memberships`
**Propósito:** Assinaturas ativas dos usuários

**Colunas principais:**
- `id` (UUID, PK)
- `user_id` (UUID, FK para users)
- `plan_id` (INT, FK para plans)
- `status` (TEXT: active, cancelled, past_due, incomplete)
- `stripe_subscription_id` (TEXT, UNIQUE)
- `stripe_customer_id` (TEXT)
- `current_period_start` (TIMESTAMPTZ)
- `current_period_end` (TIMESTAMPTZ)
- `cancel_at_period_end` (BOOLEAN)

**Verificar:**
```sql
SELECT * FROM public.memberships WHERE status = 'active' LIMIT 5;
```

---

### 5. ☐ `public.family_members`
**Propósito:** Membros do plano família

**Colunas principais:**
- `id` (UUID, PK)
- `membership_id` (UUID, FK para memberships)
- `name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `birth_date` (DATE)

**Verificar:**
```sql
SELECT * FROM public.family_members LIMIT 5;
```

---

### 6. ☐ `public.checkins`
**Propósito:** Histórico de check-ins

**Colunas principais:**
- `id` (UUID, PK)
- `user_id` (UUID, FK para users)
- `academy_id` (UUID, FK para academies)
- `location` (GEOGRAPHY)
- `checked_in_at` (TIMESTAMPTZ)

**Verificar:**
```sql
SELECT 
    c.id,
    u.full_name as user_name,
    a.name as academy_name,
    c.checked_in_at
FROM public.checkins c
JOIN public.users u ON c.user_id = u.id
JOIN public.academies a ON c.academy_id = a.id
ORDER BY c.checked_in_at DESC
LIMIT 10;
```

---

### 7. ☐ `public.academy_plans`
**Propósito:** Relação N:N entre academias e planos

**Colunas principais:**
- `id` (UUID, PK)
- `academy_id` (UUID, FK para academies)
- `plan_id` (INT, FK para plans)
- `status` (TEXT: active, inactive)

**Verificar:**
```sql
SELECT 
    ap.id,
    a.name as academy_name,
    p.name as plan_name,
    ap.status
FROM public.academy_plans ap
JOIN public.academies a ON ap.academy_id = a.id
JOIN public.plans p ON ap.plan_id = p.id
LIMIT 10;
```

---

### 8. ☐ `public.user_badges`
**Propósito:** Badges de gamificação

**Colunas principais:**
- `id` (UUID, PK)
- `user_id` (UUID, FK para users)
- `badge_type` (TEXT)
- `earned_at` (TIMESTAMPTZ)

**Verificar:**
```sql
SELECT 
    ub.badge_type,
    u.full_name,
    ub.earned_at
FROM public.user_badges ub
JOIN public.users u ON ub.user_id = u.id
ORDER BY ub.earned_at DESC
LIMIT 10;
```

---

### 9. ☐ `public.referrals`
**Propósito:** Sistema de indicações

**Colunas principais:**
- `id` (UUID, PK)
- `referrer_id` (UUID, FK para users)
- `referred_id` (UUID, FK para users)
- `status` (TEXT: pending, completed, cancelled)
- `reward_amount` (DECIMAL)
- `completed_at` (TIMESTAMPTZ)

**Verificar:**
```sql
SELECT 
    r.id,
    u1.full_name as referrer,
    u2.full_name as referred,
    r.status,
    r.reward_amount
FROM public.referrals r
JOIN public.users u1 ON r.referrer_id = u1.id
JOIN public.users u2 ON r.referred_id = u2.id
LIMIT 10;
```

---

### 10. ☐ `public.competitions`
**Propósito:** Competições/desafios

**Colunas principais:**
- `id` (UUID, PK)
- `title` (TEXT)
- `description` (TEXT)
- `start_date` (TIMESTAMPTZ)
- `end_date` (TIMESTAMPTZ)
- `prize_description` (TEXT)
- `status` (TEXT: upcoming, active, completed, cancelled)

**Verificar:**
```sql
SELECT * FROM public.competitions ORDER BY start_date DESC LIMIT 5;
```

---

### 11. ☐ `public.competition_participants`
**Propósito:** Participantes de competições

**Colunas principais:**
- `id` (UUID, PK)
- `competition_id` (UUID, FK para competitions)
- `user_id` (UUID, FK para users)
- `score` (INT)
- `rank` (INT)

**Verificar:**
```sql
SELECT 
    cp.rank,
    u.full_name,
    cp.score,
    c.title as competition
FROM public.competition_participants cp
JOIN public.users u ON cp.user_id = u.id
JOIN public.competitions c ON cp.competition_id = c.id
ORDER BY cp.rank
LIMIT 10;
```

---

## 🔍 CHECKLIST DE ÍNDICES (13 índices)

Execute para verificar:
```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Índices esperados:**
- ☐ `idx_users_email`
- ☐ `idx_users_role`
- ☐ `idx_users_referral_code`
- ☐ `idx_academies_status`
- ☐ `idx_academies_modality`
- ☐ `idx_academies_owner`
- ☐ `idx_academies_location` (GIST)
- ☐ `idx_memberships_user`
- ☐ `idx_memberships_status`
- ☐ `idx_memberships_stripe_sub`
- ☐ `idx_checkins_user`
- ☐ `idx_checkins_academy`
- ☐ `idx_checkins_date`
- ☐ `idx_family_members_membership`

---

## 🔐 CHECKLIST DE RLS (Row Level Security)

Execute para verificar:
```sql
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Todas as tabelas devem ter `rowsecurity = true`:**
- ☐ users
- ☐ plans
- ☐ academies
- ☐ memberships
- ☐ family_members
- ☐ checkins
- ☐ academy_plans
- ☐ user_badges
- ☐ referrals
- ☐ competitions
- ☐ competition_participants

---

## 🔧 CHECKLIST DE FUNÇÕES (4 funções)

Execute para verificar:
```sql
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Funções esperadas:**
- ☐ `get_my_academy()` - Retorna academia do usuário
- ☐ `check_active_membership(UUID)` - Verifica assinatura ativa
- ☐ `calculate_user_streak(UUID)` - Calcula streak
- ☐ `update_updated_at_column()` - Trigger para updated_at

---

## 📦 CHECKLIST DE STORAGE BUCKETS

**Acesse:** Supabase Dashboard → Storage

**Buckets necessários:**
- ☐ `academy-logos` (public, 2MB max)
- ☐ `academy-photos` (public, 5MB max)
- ☐ `user-avatars` (public, 2MB max)

**Para cada bucket, configurar políticas:**
- ☐ Public Access (SELECT)
- ☐ Authenticated Upload (INSERT)
- ☐ Owner Update (UPDATE)
- ☐ Owner Delete (DELETE)

---

## ✅ VERIFICAÇÃO FINAL

Execute este script completo para verificar tudo:

```sql
-- 1. Contar tabelas
SELECT 'Total de tabelas:' as info, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
-- Esperado: 11

-- 2. Contar índices
SELECT 'Total de índices:' as info, COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public';
-- Esperado: 13+

-- 3. Verificar RLS
SELECT 'Tabelas com RLS:' as info, COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
-- Esperado: 11

-- 4. Contar funções
SELECT 'Total de funções:' as info, COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
-- Esperado: 4

-- 5. Verificar planos
SELECT 'Planos cadastrados:' as info, COUNT(*) as count
FROM public.plans
WHERE active = true;
-- Esperado: 2

-- 6. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
-- Esperado: Várias políticas por tabela
```

---

## 🎉 CONCLUSÃO

Se todos os checkboxes estiverem marcados, seu banco está **100% configurado**!

**Próximos passos:**
1. ✅ Testar as aplicações (mobile e web)
2. ✅ Criar alguns dados de teste
3. ✅ Configurar webhooks do Stripe
4. ✅ Deploy em produção

---

**Dúvidas?** Consulte:
- `RELATORIO_AUDITORIA_COMPLETA.md`
- `GUIA_RAPIDO_APLICAR_CORRECOES.md`
- Documentação do Supabase
