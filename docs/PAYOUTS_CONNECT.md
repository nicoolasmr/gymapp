# 🏦 Stripe Connect Payout Automation

## Visão Geral
Este módulo automatiza os repasses financeiros para academias parceiras usando Stripe Connect, eliminando a necessidade de processar pagamentos manualmente via PIX/TED.

## Arquitetura

### Fluxo de Onboarding (Parceiro)
1. Parceiro acessa `/dashboard/finance`
2. Clica em "Conectar Conta Bancária"
3. Sistema cria uma **Express Account** no Stripe
4. Parceiro é redirecionado para completar cadastro (dados bancários, documentos)
5. Stripe valida e ativa a conta
6. Status atualizado para `active` via webhook

### Fluxo de Payout (Admin)
1. Admin acessa `/admin/payouts`
2. Seleciona período (ex: "Janeiro 2026")
3. Clica em "Recalcular Valores" (gera `payout_runs`)
4. Clica em "Simular Payout" (dry run - sem transferir dinheiro)
5. Revisa os valores
6. Clica em "Executar Payout" (real - transfere via Stripe)
7. Sistema cria `Transfer` para cada academia
8. Dinheiro cai na conta do parceiro em 1-2 dias úteis

## Tabelas

### `academies` (Estendida)
- `stripe_connect_account_id`: ID da conta Connect
- `connect_onboarding_status`: `not_started`, `pending`, `active`, `restricted`
- `connect_payouts_enabled`: Boolean (se pode receber transferências)

### `payout_transfers`
Auditoria de cada transferência individual.
- `stripe_transfer_id`: ID da transferência no Stripe
- `status`: `pending`, `completed`, `failed`, `reversed`
- `error_message`: Se falhou, qual foi o erro

## Segurança

### Idempotência
Constraint `UNIQUE(payout_run_id, academy_id)` garante que não transferimos 2x para a mesma academia no mesmo período.

### Rollback
Se uma transferência falhar:
1. Status fica como `failed` no banco
2. Admin é notificado
3. Pode tentar novamente manualmente ou via Stripe Dashboard

**Importante:** Stripe Transfers **não podem ser canceladas** após processadas. Apenas reversões manuais via Stripe Dashboard.

## Webhooks

### `account.updated`
Atualiza status de onboarding quando parceiro completa cadastro.

### `transfer.created` / `transfer.paid`
Confirma que o dinheiro foi transferido.

### `transfer.failed`
Alerta se houve falha (ex: conta bancária inválida).

## Variáveis de Ambiente

```bash
# gym-panel/.env.local
STRIPE_SECRET_KEY=sk_live_... # Chave de produção
NEXT_PUBLIC_APP_URL=https://seu-dominio.com # Para redirect URLs
```

## Rollout Seguro (Produção)

### Fase 1: Teste com 1 Academia
1. Escolher 1 academia piloto
2. Fazer onboarding completo
3. Executar payout de teste (valor pequeno, ex: R$ 50)
4. Confirmar que dinheiro chegou

### Fase 2: Rollout Gradual
1. Convidar 10% das academias
2. Monitorar por 1 semana
3. Se tudo OK, convidar 50%
4. Depois de 2 semanas, 100%

### Fase 3: Deprecar CSV
Após 3 meses de operação estável, remover botão "Exportar CSV" e tornar Connect obrigatório.

## Troubleshooting

### Erro: "Account not found"
**Causa:** `stripe_connect_account_id` no banco não corresponde a uma conta real no Stripe.
**Solução:** Limpar o campo e refazer onboarding.

### Erro: "Insufficient funds"
**Causa:** Saldo da plataforma no Stripe está negativo.
**Solução:** Adicionar fundos à conta Stripe da plataforma.

### Transferência em "pending" por mais de 3 dias
**Causa:** Stripe está revisando a conta do parceiro (compliance).
**Solução:** Entrar em contato com suporte do Stripe.

## Métricas Recomendadas
- **Adoption Rate:** % de academias com Connect ativo
- **Transfer Success Rate:** % de transferências que completam sem erro
- **Time to Payout:** Tempo médio entre fechamento e dinheiro na conta

---
**Conclusão:** Stripe Connect elimina 90% do trabalho manual de pagamentos e reduz erros humanos a zero.
