# 🩺 Observability Strategy

## Logging
Usamos `lib/logger.ts` para logs estruturados JSON.
*   **Info:** Fluxos normais (`Starting QA Simulation`).
*   **Error:** Exceções não tratadas.
*   **Warn:** Falhas recuperáveis (ex: Webhook com assinatura inválida).

## Health Checks
Endpoint: `/admin/health`
Monitora:
1.  **Conectividade Supabase** (Query count simples).
2.  **Conectividade Stripe** (Status da configuração).
3.  **Processo Node.js** (Uptime).

## Sentry (Integração Futura)
Para ativar Sentry:
1.  Adicione `NEXT_PUBLIC_SENTRY_DSN` no `.env`.
2.  Descomente as linhas no `lib/logger.ts`.
3.  Execute `npx @sentry/wizard@latest -i nextjs`.

## Alertas Recomendados
Configure alertas na Vercel/Datadog para:
*   Taxa de Erro 500 > 1%.
*   Latência p99 > 2s.
*   Webhook Failures (Stripe) > 0.
