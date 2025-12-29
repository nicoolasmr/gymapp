# 🤝 Sistema de Indicação (Referral System) - MVP 0.6.1

## Visão Geral
O sistema permite que usuários convidem amigos e ganhem recompensas financeiras (desconto de 10% na próxima fatura) quando o convidado assina um plano.

## Regras de Negócio
1.  **Elegibilidade:** Qualquer usuário ativo pode indicar.
2.  **Recompensa:** 10% de desconto (single-use) na próxima fatura recorrente do **Indicador**.
3.  **Gatilho:** A recompensa é liberada somente após o **pagamento confirmado** da primeira mensalidade do **Convidado**.
4.  **Limites:** 1 desconto por convidado ativo. Não acumulativo na mesma fatura (regra de negócio Stripe: 1 cupom por vez, ou crédito no saldo).
    *   *Decisão Técnica:* Usaremos **Customer Balance (Crédito)** no Stripe para abater o valor, pois permite acumular múltiplos referrals (ex: indicar 10 amigos = 100% off).

## Arquitetura de Dados (Supabase)

### 1. Tabela `referral_codes` (Já existe)
*   Mapeia `user_id` <-> `code` (ex: "NICOLAS123").

### 2. Tabela `referrals` (Tracking)
*   Rastreia a relação "Quem indicou Quem".
*   Status: `invited` -> `signed_up` -> `converted` (pagou).

### 3. Tabela `referral_rewards` (Financeiro)
*   Registra o direito ao desconto.
*   `status`: 
    *   `pending`: Convidado assinou mas não pagou (trial).
    *   `earned`: Convidado pagou. Crédito pronto para ser enviado ao Stripe.
    *   `processed`: Crédito aplicado no saldo do Stripe do indicador.

## Fluxo Técnico

### A. Convite (Mobile)
1.  App chama RPC `get_or_create_referral_code`.
2.  Usuário compartilha link: `https://app.evolve.com/signup?ref=CODE`.

### B. Cadastro (Mobile/Web)
1.  No Signup, App checa se tem `referral_code`.
2.  Chama RPC `validate_referral_code`.
3.  Se válido, salva o código no `metadata` do usuário no Auth ou numa tabela temporária.

### C. Assinatura (Checkout)
1.  Ao criar a Subscription no Stripe, enviamos o `referral_code` nos `metadata` da Subscription.

### D. Processamento (Webhook Stripe)
1.  Recebemos evento `invoice.payment_succeeded`.
2.  Verificamos se a Subscription tem `metadata.referral_code`.
3.  Se sim:
    *   Buscamos o dono do código (Indicador).
    *   Criamos registro em `referrals` (se não existir) com status `converted`.
    *   Criamos registro em `referral_rewards` com status `earned`.
    *   **Ação Financeira:** Adicionamos crédito ao Customer do Indicador no Stripe (ex: 10% do valor do plano dele).
    *   Atualizamos `referral_rewards` para `processed`.

## Segurança (Anti-Fraude)
*   **Self-Referral:** Bloqueado no RPC de validação.
*   **Duplicidade:** Unique constraint em `referrals(referrer_id, referred_user_id)`.
*   **Auditoria:** Todos os passos geram logs em `referral_rewards`.

## Endpoints API (Gym Panel)
*   `POST /api/webhooks/stripe`: Processa o pagamento e gera recompensa.
*   `GET /api/admin/referrals`: Dados para o painel administrativo.

## Variáveis de Ambiente Necessárias
*   `STRIPE_SECRET_KEY` (Já existe)
*   `STRIPE_WEBHOOK_SECRET` (Já existe)
