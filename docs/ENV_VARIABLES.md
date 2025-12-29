# Variáveis de Ambiente - Fitness App MVP 0.3

## Mobile App (fitness-app/.env)

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# API Backend (para notificações)
EXPO_PUBLIC_API_URL=http://localhost:3000

# Expo (para push notifications)
# Configurar no app.json: extra.eas.projectId
```

## Web Panel (gym-panel/.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Como Obter as Chaves

### Supabase:
1. Acesse seu projeto no Supabase
2. Settings → API
3. Copie:
   - `URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public` → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` → SUPABASE_SERVICE_ROLE_KEY (⚠️ NUNCA expor no frontend)

### Stripe:
1. Acesse Stripe Dashboard
2. Developers → API Keys
3. Copie as chaves de teste
4. Webhooks → Add endpoint → Copie o secret

### Expo Push:
1. Execute: `npx expo login`
2. Execute: `eas build:configure`
3. O projectId será gerado automaticamente
