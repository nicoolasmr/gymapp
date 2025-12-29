# 🔔 Push Notifications System

## Arquitetura
O sistema de notificações push é composto por 3 camadas:

1. **Mobile (Expo):** Solicita permissão e registra o token.
2. **Database (Supabase):** Armazena tokens e logs de notificações.
3. **Backend (Next.js):** Orquestra o envio via Expo Push API.

## Tipos de Notificações

| Tipo | Trigger | Frequência | Exemplo |
| :--- | :--- | :--- | :--- |
| **Streak Risk** | Usuário não treinou hoje e tem streak > 0 | 1x/dia (18h) | "🔥 Sequência de 7 dias em risco!" |
| **Payment Failed** | Stripe webhook `invoice.payment_failed` | Imediato | "⚠️ Pagamento Recusado" |
| **Payment Success** | Stripe webhook `invoice.payment_succeeded` | Imediato | "✅ Pagamento Confirmado" |

## Regras de Negócio

### Idempotência
Cada notificação tem uma `dedup_key` única (ex: `user_123_streak_risk_2025-12-29`).
Se já foi enviada hoje, não envia novamente.

### Quiet Hours
Notificações de streak **não** são enviadas entre 22:00 e 08:00.
Notificações de billing são enviadas imediatamente (urgentes).

### Opt-Out
Usuários podem desabilitar notificações nas configurações do dispositivo.
O sistema respeita a permissão do OS.

## Setup (Desenvolvimento)

### 1. Configurar Expo Project ID
No `app.json`:
\`\`\`json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-expo-project-id"
      }
    }
  }
}
\`\`\`

### 2. Variáveis de Ambiente
\`\`\`bash
# gym-panel/.env.local
CRON_SECRET=your-secret-key-for-cron-auth
\`\`\`

### 3. Rodar Migration
Execute `MVP_0_7_2_PUSH_NOTIFICATIONS.sql` no Supabase.

### 4. Configurar Cron (Vercel)
Crie `vercel.json`:
\`\`\`json
{
  "crons": [{
    "path": "/api/cron/send-push-notifications?type=streak_risk",
    "schedule": "0 18 * * *"
  }]
}
\`\`\`

## Troubleshooting

### Notificação não chega
1. Verificar se o token foi registrado: `SELECT * FROM user_push_tokens WHERE user_id = 'xxx'`.
2. Verificar logs: `SELECT * FROM push_notifications_log WHERE user_id = 'xxx' ORDER BY created_at DESC`.
3. Testar manualmente via Expo Push Tool: https://expo.dev/notifications

### Erro "Invalid Push Token"
O token do Expo expira se o app for desinstalado.
Solução: Re-registrar o token ao fazer login.

## Métricas Recomendadas
- **Opt-in Rate:** % de usuários que aceitaram notificações.
- **Open Rate:** % de notificações que foram abertas (via `opened_at`).
- **Conversion Rate:** % de usuários que fizeram check-in após receber "Streak Risk".
