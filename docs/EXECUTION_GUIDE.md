# 🚀 GUIA DE EXECUÇÃO - MVP 0.3

## ✅ Checklist de Execução

Execute os passos na ordem abaixo:

---

## PASSO 1: Aplicar Migrações no Supabase

### 1.1 Acessar Supabase
1. Abra [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: `hhwxlpadwvprpbebbucz`
3. Vá em **SQL Editor** (menu lateral esquerdo)

### 1.2 Executar Migração Completa
1. Clique em **New Query**
2. Copie TODO o conteúdo do arquivo: `MIGRATION_COMPLETE_MVP_0_3.sql`
3. Cole no editor
4. Clique em **RUN** (ou Ctrl/Cmd + Enter)
5. ✅ Aguarde a mensagem de sucesso

**Tempo estimado:** 10-15 segundos

---

## PASSO 2: Configurar Dados Iniciais

### 2.1 Obter Suas Coordenadas GPS
1. Abra [Google Maps](https://www.google.com/maps)
2. Clique com botão direito no local da sua casa/trabalho
3. Clique em "Latitude, Longitude" (primeiro item)
4. Copie os valores (ex: `-23.5505, -46.6333`)

### 2.2 Executar Script de Dados
1. No Supabase SQL Editor, crie **New Query**
2. Copie o conteúdo de: `INITIAL_DATA_SETUP.sql`
3. **IMPORTANTE:** Edite as linhas:
   ```sql
   lat: -23.5505,  -- ⚠️ COLE SUA LATITUDE AQUI
   long: -46.6333, -- ⚠️ COLE SUA LONGITUDE AQUI
   ```
4. **IMPORTANTE:** Edite a linha:
   ```sql
   WHERE email = 'seu@email.com';  -- ⚠️ COLOQUE SEU EMAIL
   ```
5. Clique em **RUN**
6. ✅ Verifique se retornou o ID da academia e seu usuário admin

---

## PASSO 3: Verificar Instalação

### 3.1 No Supabase - Table Editor
Verifique se as tabelas foram criadas:
- ✅ `family_invites`
- ✅ `notifications_log`
- ✅ `payouts`

### 3.2 No Supabase - Database → Functions
Verifique se as funções foram criadas:
- ✅ `create_family_invite`
- ✅ `accept_family_invite`
- ✅ `perform_checkin`
- ✅ `get_admin_stats`
- ✅ `get_frequent_users`
- ✅ `get_daily_checkins`

---

## PASSO 4: Configurar Variáveis de Ambiente

### 4.1 Obter Service Role Key
1. No Supabase: **Settings → API**
2. Copie a chave `service_role` (⚠️ secreta!)
3. Cole no arquivo `gym-panel/.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
   ```

### 4.2 Verificar Arquivos .env
✅ `fitness-app/.env` - deve ter:
```env
EXPO_PUBLIC_SUPABASE_URL=https://hhwxlpadwvprpbebbucz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_API_URL=http://localhost:3000
```

✅ `gym-panel/.env.local` - deve ter:
```env
NEXT_PUBLIC_SUPABASE_URL=https://hhwxlpadwvprpbebbucz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
STRIPE_SECRET_KEY=sk_test_...
```

---

## PASSO 5: Instalar Dependências

### 5.1 Mobile App
```bash
cd fitness-app
npm install
```

### 5.2 Web Panel
```bash
cd gym-panel
npm install
```

---

## PASSO 6: Rodar as Aplicações

### 6.1 Terminal 1 - Web Panel
```bash
cd gym-panel
npm run dev
```
✅ Aguarde: `Ready on http://localhost:3000`

### 6.2 Terminal 2 - Mobile App
```bash
cd fitness-app
npx expo start
```
✅ Aguarde o QR Code aparecer

---

## PASSO 7: Testar Funcionalidades

### 7.1 Teste: Painel Admin
1. Abra: http://localhost:3000/admin
2. Faça login com seu usuário admin
3. ✅ Deve mostrar estatísticas do sistema

### 7.2 Teste: Dashboard Financeiro
1. Abra: http://localhost:3000/dashboard/finance
2. ✅ Deve mostrar "Mês Atual" e gráficos

### 7.3 Teste: Mobile - Check-in
1. Abra o app no celular (Expo Go)
2. Faça login
3. Selecione a academia
4. Clique "Fazer Check-in Agora"
5. Conceda permissão de localização
6. ✅ Se estiver perto (< 300m): Sucesso!
7. ✅ Se estiver longe: Mensagem de erro

### 7.4 Teste: Convite Família
1. No app, vá para Perfil
2. Se tiver Plano Família: "+ Adicionar Membro"
3. Compartilhe o link
4. Abra em outro dispositivo
5. ✅ Deve abrir tela de convite

### 7.5 Teste: Notificações Push
1. Faça check-in no app
2. ✅ Deve receber notificação (se em dispositivo físico)
3. Verifique no Supabase → `notifications_log`

---

## PASSO 8: Validação Final

Execute no Supabase SQL Editor:

```sql
-- Ver academias cadastradas
SELECT id, name, lat, long, active FROM academies;

-- Ver seu usuário admin
SELECT id, email, role FROM users WHERE role = 'admin';

-- Ver planos
SELECT * FROM plans;

-- Testar RPC de stats
SELECT * FROM get_admin_stats();
```

---

## 🎉 PRONTO!

Se todos os passos acima funcionaram, seu MVP 0.3 está **100% operacional**!

## 📊 Próximos Passos

1. **Criar conta de teste** no app mobile
2. **Assinar um plano** (use cartão teste Stripe: `4242 4242 4242 4242`)
3. **Fazer check-ins** reais
4. **Convidar membros** para plano família
5. **Monitorar** no painel admin

---

## 🆘 Problemas Comuns

### Erro: "RPC function not found"
- ✅ Execute novamente `MIGRATION_COMPLETE_MVP_0_3.sql`

### Erro: "Cannot find module"
- ✅ Execute `npm install` novamente

### Check-in falha: "Muito longe"
- ✅ Verifique se a academia tem lat/long corretos
- ✅ Use suas coordenadas reais no Google Maps

### Notificações não chegam
- ✅ Use dispositivo físico (não funciona em simulador)
- ✅ Verifique se deu permissão

---

## 📞 Suporte

Consulte:
- `MVP_0_3_ENTREGA_FINAL.md` - Documentação completa
- `SETUP_GUIDE.md` - Guia detalhado
- `README.md` - Resumo executivo

**Boa sorte! 🚀**
