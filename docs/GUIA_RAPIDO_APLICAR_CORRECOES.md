# 🚀 GUIA RÁPIDO: COMO APLICAR AS CORREÇÕES

## 📋 PASSO 1: BACKUP DO BANCO ATUAL

Antes de fazer qualquer mudança, faça backup do banco:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute:
```sql
-- Backup das tabelas principais
SELECT * FROM public.users;
SELECT * FROM public.academies;
SELECT * FROM public.memberships;
SELECT * FROM public.checkins;
```
4. Exporte os resultados (Download CSV)

---

## 📊 PASSO 2: APLICAR NOVO SCHEMA

### Opção A: Banco Novo (Recomendado para Desenvolvimento)

1. Acesse Supabase Dashboard → **SQL Editor**
2. Abra o arquivo: `SUPABASE_SCHEMA_FINAL_CLEAN.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run**
6. Aguarde a execução (pode levar 1-2 minutos)

### Opção B: Banco Existente (Produção)

⚠️ **ATENÇÃO:** Isso pode causar perda de dados se houver conflitos!

1. Primeiro, execute apenas as seções de **CREATE TABLE IF NOT EXISTS**
2. Depois, execute as seções de **ALTER TABLE** e **POLICIES**
3. Por último, execute as **FUNÇÕES**

---

## 🗑️ PASSO 3: LIMPAR ARQUIVOS SQL ANTIGOS

Execute no terminal:

```bash
cd /Users/nicolasmoreira/Desktop/ANTIGRAVATY

# Criar pasta de arquivo
mkdir -p archive/sql-old

# Mover arquivos antigos
mv MIGRATION_*.sql archive/sql-old/
mv FIX_*.sql archive/sql-old/
mv DEBUG_*.sql archive/sql-old/
mv INITIAL_*.sql archive/sql-old/
mv LINK_*.sql archive/sql-old/
mv FULL_*.sql archive/sql-old/

# Manter apenas os arquivos essenciais:
# - SUPABASE_SCHEMA_FINAL_CLEAN.sql (novo schema)
# - CREATE_TABLES_FIRST.sql (referência histórica)
```

---

## 📦 PASSO 4: CONFIGURAR STORAGE BUCKETS

No Supabase Dashboard:

1. Vá em **Storage**
2. Clique em **New Bucket**
3. Crie os seguintes buckets:

### Bucket 1: academy-logos
- Nome: `academy-logos`
- Public: ✅ Sim
- File size limit: 2 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### Bucket 2: academy-photos
- Nome: `academy-photos`
- Public: ✅ Sim
- File size limit: 5 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### Bucket 3: user-avatars
- Nome: `user-avatars`
- Public: ✅ Sim
- File size limit: 2 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### Políticas de Storage

Para cada bucket, adicione as políticas:

```sql
-- Permitir leitura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'academy-logos' );

-- Permitir upload autenticado
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'academy-logos' 
  AND auth.role() = 'authenticated'
);

-- Permitir update do próprio arquivo
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING ( auth.uid()::text = owner );

-- Permitir delete do próprio arquivo
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING ( auth.uid()::text = owner );
```

Repita para `academy-photos` e `user-avatars` (mudando o nome do bucket).

---

## ✅ PASSO 5: VERIFICAR INSTALAÇÃO

Execute no SQL Editor:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Deve retornar 11 tabelas:
-- academies
-- academy_plans
-- checkins
-- competition_participants
-- competitions
-- family_members
-- memberships
-- plans
-- referrals
-- user_badges
-- users

-- Verificar planos
SELECT * FROM public.plans;

-- Deve retornar:
-- 1 | Plano Solo | solo | 99.00 | 1
-- 2 | Plano Família | family | 149.00 | 4

-- Verificar funções
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- Deve retornar:
-- get_my_academy
-- check_active_membership
-- calculate_user_streak
-- update_updated_at_column
```

---

## 🔧 PASSO 6: TESTAR APLICAÇÕES

### Mobile App

```bash
cd fitness-app
ulimit -n 10240
npx expo start --web -c
```

Acesse: http://localhost:8081

**Testar:**
- ✅ Login/Signup
- ✅ Listagem de academias
- ✅ Detalhes de academia
- ✅ Perfil do usuário

### Gym Panel

```bash
cd gym-panel
npm run dev
```

Acesse: http://localhost:3000

**Testar:**
- ✅ Login como parceiro
- ✅ Dashboard
- ✅ Editar academia
- ✅ Ver planos

---

## 🐛 TROUBLESHOOTING

### Erro: "relation already exists"

**Solução:** Algumas tabelas já existem. Execute apenas as partes que faltam ou use `DROP TABLE` antes (⚠️ cuidado com perda de dados).

### Erro: "permission denied"

**Solução:** Certifique-se de estar usando o **service_role key** no Supabase ou execute como superuser.

### Erro: "function already exists"

**Solução:** Use `CREATE OR REPLACE FUNCTION` (já está no script).

### Storage buckets não aparecem

**Solução:** Verifique se você está no projeto correto do Supabase. Buckets são específicos por projeto.

---

## 📞 PRECISA DE AJUDA?

Se algo der errado:

1. **Verifique os logs** no Supabase Dashboard → Logs
2. **Consulte a documentação** do Supabase
3. **Reverta o backup** se necessário
4. **Me chame** para ajudar!

---

## ✨ PRÓXIMOS PASSOS

Após aplicar tudo:

1. ✅ Testar todas as funcionalidades
2. ✅ Criar alguns dados de teste
3. ✅ Configurar Stripe (webhooks)
4. ✅ Deploy em produção

---

**Boa sorte! 🚀**
