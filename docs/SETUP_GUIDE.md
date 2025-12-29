# Guia de Setup Completo - MVP 0.3

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase (grátis)
- Conta Stripe (modo teste)
- Expo CLI (`npm install -g expo-cli`)
- Git

---

## 🗄️ 1. Configurar Supabase

### 1.1 Criar Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Crie novo projeto
3. Anote a senha do banco

### 1.2 Executar Migrações

No SQL Editor do Supabase, execute **em ordem**:

```sql
-- 1. Primeiro
-- Cole o conteúdo de: gym-panel/supabase_migrations_mvp_0_3.sql

-- 2. Segundo
-- Cole o conteúdo de: gym-panel/supabase_migrations_mvp_0_3_part2.sql

-- 3. Terceiro
-- Cole o conteúdo de: gym-panel/supabase_migrations_mvp_0_3_part3.sql
```

### 1.3 Configurar Dados Iniciais

```sql
-- Criar academia de teste com localização
INSERT INTO academies (name, address, lat, long, active)
VALUES (
  'Academia Teste',
  'Rua Exemplo, 123 - São Paulo',
  -23.5505,  -- Latitude de SP (ajuste para sua localização)
  -46.6333,  -- Longitude de SP
  TRUE
);

-- Criar plano Solo
INSERT INTO plans (name, price, max_members)
VALUES ('Plano Solo', 79.90, 1);

-- Criar plano Família
INSERT INTO plans (name, price, max_members)
VALUES ('Plano Família', 149.90, 4);

-- Tornar seu usuário admin (após criar conta)
-- Substitua 'seu@email.com' pelo seu email
UPDATE users 
SET role = 'admin' 
WHERE email = 'seu@email.com';
```

### 1.4 Configurar Storage (Opcional)

1. Storage → New Bucket
2. Nome: `avatars` (público)
3. Nome: `gym-photos` (público)

---

## 💳 2. Configurar Stripe

### 2.1 Criar Produtos

1. Acesse Stripe Dashboard
2. Products → Add Product
3. Criar dois produtos:
   - **Plano Solo**: R$ 79,90/mês
   - **Plano Família**: R$ 149,90/mês
4. Anote os `price_id` de cada um

### 2.2 Configurar Webhook

1. Developers → Webhooks → Add endpoint
2. URL: `https://seu-dominio.com/api/webhooks/stripe`
   - Para desenvolvimento local: use [ngrok](https://ngrok.com)
3. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copie o `Signing secret`

---

## 📱 3. Configurar Mobile App

### 3.1 Instalar Dependências

```bash
cd fitness-app
npm install
```

### 3.2 Configurar .env

Crie `fitness-app/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 3.3 Configurar app.json

Edite `fitness-app/app.json`:

```json
{
  "expo": {
    "scheme": "fitnessapp",
    "extra": {
      "eas": {
        "projectId": "seu-project-id-expo"
      }
    }
  }
}
```

### 3.4 Rodar App

```bash
npx expo start
```

Escaneie o QR Code com Expo Go (iOS/Android)

---

## 🌐 4. Configurar Web Panel

### 4.1 Instalar Dependências

```bash
cd gym-panel
npm install
```

### 4.2 Configurar .env.local

Crie `gym-panel/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4.3 Rodar Web Panel

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 🧪 5. Testar Sistema

### 5.1 Criar Conta
1. Abra o app mobile
2. Signup com email/senha
3. Verifique que usuário foi criado no Supabase

### 5.2 Assinar Plano
1. No app → Modal de assinatura
2. Escolha Plano Solo ou Família
3. Complete checkout Stripe (use cartão teste: `4242 4242 4242 4242`)
4. Verifique webhook no Supabase (tabela `memberships`)

### 5.3 Fazer Check-in
1. Vá até uma academia (ou use fake GPS)
2. Selecione a academia
3. "Fazer Check-in Agora"
4. Conceda permissão de localização
5. Verifique sucesso

### 5.4 Testar Convite Família
1. Login com usuário que tem Plano Família
2. Perfil → "+ Adicionar Membro"
3. Compartilhe link
4. Abra em outro dispositivo
5. Aceite convite

### 5.5 Acessar Admin
1. Web: http://localhost:3000/admin
2. Login com usuário admin
3. Verifique estatísticas

---

## 🔧 Troubleshooting

### Erro: "Cannot find module @supabase/..."
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Erro: "Expo notifications not working"
```bash
cd fitness-app
npm install expo-notifications expo-device expo-constants --legacy-peer-deps
```

### Erro: "RPC function not found"
- Verifique se executou todas as migrações SQL
- Execute novamente no SQL Editor

### Erro: "Stripe webhook failed"
- Verifique se o webhook secret está correto
- Use ngrok para desenvolvimento local:
  ```bash
  ngrok http 3000
  # Use a URL do ngrok no Stripe webhook
  ```

### Check-in falha com "Você está muito longe"
- Verifique se a academia tem `lat` e `long` configurados
- Use fake GPS ou ajuste as coordenadas para sua localização atual

---

## 📊 Monitoramento

### Logs Supabase
- Database → Logs
- Verifique erros de RPC

### Logs Stripe
- Developers → Webhooks → Logs
- Verifique eventos recebidos

### Logs Expo
- Terminal onde rodou `npx expo start`
- Verifique erros de notificação

---

## 🚀 Deploy (Produção)

### Mobile (Expo)
```bash
cd fitness-app
eas build --platform all
eas submit --platform all
```

### Web (Vercel)
```bash
cd gym-panel
vercel --prod
```

Configure as variáveis de ambiente no Vercel Dashboard.

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs
2. Consulte a documentação oficial:
   - [Supabase Docs](https://supabase.com/docs)
   - [Expo Docs](https://docs.expo.dev)
   - [Next.js Docs](https://nextjs.org/docs)
3. Revise o arquivo `MVP_0_3_ENTREGA_FINAL.md`

**Boa sorte! 🎉**
