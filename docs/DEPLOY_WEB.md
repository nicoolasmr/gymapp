# 🚀 Procedimento de Deploy Web (Gym Panel)

## Checklist Pré-Deploy
1.  **Environment Variables:** Certifique-se que o Vercel/Container tenha:
    *   `NEXT_PUBLIC_SUPABASE_URL` (Prod)
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Prod)
    *   `SUPABASE_SERVICE_ROLE_KEY` (Prod - CRÍTICO)
    *   `STRIPE_SECRET_KEY` (Prod Live Key)
    *   `STRIPE_WEBHOOK_SECRET` (Prod Webhook Signing Secret)
2.  **Database Migration:**
    *   Rodar `VERIFY_DEPLOY.sql` no Supabase Prod.
    *   Se passar sem erros, o banco está pronto.

## Deploy na Vercel (Recomendado)
O projeto é Next.js nativo, deploy na Vercel é Zero Config.
1.  Conecte o repositório GitHub.
2.  Configure as Env Vars.
3.  Clique em "Deploy".

## Deploy em Docker/K8s
Se for hospedar na AWS/GCP, use o `Dockerfile` na raiz do `gym-panel`.
```bash
cd gym-panel
docker build -t evolve-panel:latest .
docker run -p 3000:3000 evolve-panel:latest
```

## Smoke Test (Pós-Deploy)
1.  Acesse `/admin/health`.
    *   Verifique se DB e Stripe estão "Healthy".
2.  Acesse `/admin/qa`.
    *   Rode a Simulação Financeira.
3.  Teste um Webhook real do Stripe (via Stripe CLI ou Test Mode).
