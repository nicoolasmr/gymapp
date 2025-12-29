# 📘 Relatório Mestre: Evolve Fitness Platform (Técnico & Funcional)
**Versão:** MVP 0.6.4 (Completo)
**Data:** 29/12/2025
**Abrangência:** Arquitetura do Sistema + Novas Funcionalidades de Negócio

Este documento consolida a estrutura técnica do projeto e detalha as funcionalidades de negócio implementadas nas últimas Sprints (Rentabilização, Retenção e Reputação).

---

# PARTE 1: O Produto (Funcionalidades & Regras de Negócio)

Nesta fase (MVP 0.6), transformamos o app de check-in em um ecossistema econômico completo.

## 1. 🚀 Growth Engine (Sistema de Indicações)
*Focada em crescimento orgânico (Viral Loop).*

*   **Funcionalidade (Aluno):**
    *   Tela "Indique e Ganhe": Gera código único (ex: `NICK99`).
    *   Compartilhamento via WhatsApp/Social.
    *   Visualização de status: "Amigo Cadastrado" vs "Amigo Pagante".
*   **Regra de Negócio (Recompensa):**
    *   **Gatilho:** O bônus só é liberado quando o convidado paga a 1ª mensalidade.
    *   **Reward:** Crédito automático (Stripe Customer Balance) para abater na próxima fatura do indicador.
    *   **Anti-Fraude:** Bloqueio de auto-indicação e contas duplicadas.

## 2. ⭐ Reputation System (Avaliações & Ranking)
*Focada em confiança e qualidade da rede.*

*   **Funcionalidade (Aluno):**
    *   Votar (1-5 estrelas) e comentar após check-in.
    *   Marcar reviews como "Útil" ou "Denunciar".
*   **Funcionalidade (Parceiro):**
    *   Ver avaliações no Painel.
    *   Responder comentários (gestão de crise).
*   **Regra de Negócio (Ranking Inteligente):**
    *   **Anti-Fraude:** Só pode avaliar quem treinou na unidade nos últimos 30 dias (Validado via DB Trigger).
    *   **Algoritmo:** Uso de "Média Bayesiana" (Materialized View). Uma academia com 1 voto 5.0 não fica acima de uma com 100 votos 4.9.
    *   **Moderação:** Admin pode ocultar reviews ofensivos, que somem automaticamente do App.

## 3. 📢 Ad Network (Campanhas Patrocinadas)
*Focada em nova linha de receita B2B.*

*   **Funcionalidade (Parceiro):**
    *   Contratar destaque ("Boost") via Painel.
    *   Pagamento via Stripe (Checkout transparente).
    *   Dashboard de Performance: Visualizar Impressões, Cliques e CTR (Taxa de Clique).
*   **Funcionalidade (App):**
    *   Exibição de cards patrocinados no topo da busca e da Home.
    *   Tracking de eventos (Impressão/Clique) em tempo real.

## 4. 💸 Financial Engine (Payouts & Fechamento)
*Focada em sustentabilidade e operação.*

*   **Funcionalidade (Admin Financeiro):**
    *   **Fechamento Mensal:** Criação de "Snapshots" (ex: Jan/2026) que congelam os números.
    *   **Cálculo Automático RPC:** O sistema varre milhões de check-ins e calcula quanto cada academia deve receber baseado na modalidade.
    *   **Exportação:** Gera CSV detalhado para pagamento em lote (Batch Payments).

---

# PARTE 2: A Tecnologia (Arquitetura & Código)

## 1. 🏗️ Arquitetura
*   **Modelo:** Monorepo Híbrido.
*   **Frontend Mobile:** React Native (Expo) - Focado em performance e UX.
*   **Frontend Web:** Next.js 14 (App Router) - Focado em Dashboards e SEO.
*   **Backend:** Serverless (Supabase + Edge Functions conceituais via Next API).
*   **Banco de Dados:** PostgreSQL relacional com RLS (Segurança a nível de linha).

## 2. 🗺️ Mapa de Arquivos Críticos (Criados no MVP 0.6)

### Banco de Dados (Migrations)
*   `gym-panel/supabase/migrations/MVP_0_6_1_REFERRALS.sql`: Tabelas de rewards e views de performance de indicação.
*   `gym-panel/supabase/migrations/MVP_0_6_2_REVIEWS.sql`: Tabelas de reviews, votos e a View Materializada de Ranking.
*   `gym-panel/supabase/migrations/MVP_0_6_3_ADS.sql`: Engine de Ads e tabela de eventos de analytics.
*   `gym-panel/supabase/migrations/MVP_0_6_4_PAYOUTS.sql`: Tabelas de fechamento contábil.
*   `gym-panel/supabase/VERIFY_DEPLOY.sql`: Script de auditoria de deploy (Unit Test de Infra).

### Painel Web (`gym-panel`)
*   `/app/dashboard/ads/page.tsx`: Dashboard de Campanhas do Parceiro.
*   `/app/admin/payouts/page.tsx`: Console Financeiro do Admin.
*   `/app/admin/reviews/page.tsx`: Console de Moderação.
*   `/app/admin/referrals/page.tsx`: Console de Auditoria de Growth.
*   `/app/api/webhooks/stripe/route.ts`: O orquestrador financeiro (revisado para suportar Ads e Referrals).

### Mobile App (`fitness-app`)
*   `/app/profile/referrals.tsx`: Tela de compartilhamento de código.
*   `/app/academy/[id]/review.tsx`: Tela de submissão de avaliação.
*   `/services/referralService.ts`: Lógica de client-side para growth.
*   `/services/reviewService.ts`: Lógica de consumo de reviews filtrados.

---

## 3. 🔐 Segurança & Dados
O sistema implementa **Zero Trust** no banco de dados.
*   **Tabelas Financeiras (`payouts`, `ads`, `rewards`):** Apenas `service_role` (Backend) pode escrever. Usuários têm acesso somente leitura aos seus próprios dados.
*   **LGPD/Privacy:** Dados sensíveis de pagamento ficam no Stripe. O banco só guarda tokens e IDs de referência.

---

## 4. Próximos Passos (Roadmap Técnico)
Com a conclusão do MVP 0.6, a plataforma está funcionalmente completa para operação comercial.
1.  **QA End-to-End:** Validar fluxo completo de dinheiro (User paga -> Split -> Payout).
2.  **Stripe Connect (v0.7):** Automatizar o último passo (Payout) que hoje é manual via CSV.
3.  **Observability:** Implementar logs de erro mais granulares (Sentry) antes do Scale-up.

---
**Status Final:** 🟢 **PRONTO PARA DEPLOY**
Todas as funcionalidades críticas de negócio foram codificadas, testadas unitariamente via SQL e integradas ao Frontend.
