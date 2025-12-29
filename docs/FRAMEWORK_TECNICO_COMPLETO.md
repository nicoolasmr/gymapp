# 🏛️ Framework Técnico Completo: Evolve Fitness Platform
**Versão:** MVP 0.6.4 (Production Ready)
**Data:** 29/12/2025
**Arquitetura:** Monorepo Híbrido (Mobile First + SaaS Web)

Este documento é a "Bíblia Técnica" do sistema, detalhando arquitetura, dados, rotas e módulos.

---

## 1. 🏗️ Arquitetura de Alto Nível
O sistema opera em uma arquitetura **Serverless & Event-Driven**, focada em escalabilidade horizontal.

*   **Client A (Mobile):** React Native (Expo) consome dados via REST/RFC diretamente do Supabase.
*   **Client B (Web/SaaS):** Next.js 14 operando como Frontend (Dashboard) e Backend (API Routes para Webhooks e Orquestração).
*   **Database & Auth:** Supabase (PostgreSQL) atua como fonte da verdade e engine de segurança (RLS).
*   **Pagamentos:** Stripe (Assinaturas e Repasses).

---

## 2. 🔐 Segurança & Multi-Tenancy (Multi-inquilinato)
O sistema utiliza **RLS (Row Level Security)** nativo do Postgres. Não separamos schemas por cliente. Todos estão no schema `public`, mas só veem o que podem.

*   **Nível Usuário:** Só acessa seus dados (`uid() = user_id`).
*   **Nível Parceiro (Tenancy):**
    *   Donos de academia têm role implícita via tabela de junção (ex: `academy_owners`).
    *   Policies SQL garantem: "Se User X é dono da Academy Y, ele pode ler a tabela `checkins` onde `academy_id = Y`".
*   **Nível Super Admin:** Role checada via tabela `users.role` ou Claims, permitindo bypass controlado para auditoria (`/admin`).

---

## 3. 💾 Data Model (Principais Tabelas)

### Núcleo (Core)
*   `users`: Perfis estendidos (vinculado ao `auth.users`).
*   `academies`: O "Tenant" (Nome, Localização Geoespacial, Regras).
*   `memberships`: Vínculo com Stripe (Plano Free, Solo, Family).

### Acesso & Operação
*   `checkins`: Log imutável de entrada (validado por GPS/QR).
*   `gym_plans`: Contratos entre Academia e Plataforma (valor por check-in).

### Gamification & Social
*   `competitions`: Torneios (Regras, Datas).
*   `competition_participants`: Score e Ranking.
*   `user_levels`: Tabela de XP e Níveis (Gamification Engine).
*   `communities`: Grupos sociais dentro do app.

### Módulos MVP 0.6 (Novos)
*   **Reputation:** `academy_reviews` (Comentários), `review_votes`, `mv_academy_rankings` (View Materializada).
*   **Growth:** `referral_codes`, `referrals` (Tracking), `referral_rewards` (Financeiro).
*   **Ads:** `ads_campaigns` (Config), `ads_events` (Analytics Big Data).
*   **Finance:** `payout_periods`, `payout_runs` (Fechamento de Caixa).

---

## 4. 🗺️ Mapa de Rotas (Application Map)

### 📱 Mobile App (`fitness-app`)
Lógica baseada em **Expo Router (File-based routing)**.

*   `app/(auth)/*`: Login, Cadastro, Recuperação de Senha.
*   `app/(tabs)/home.tsx`: Dashboard do Aluno (XP, Nível, Check-in Rápido, Status da Assinatura).
*   `app/(tabs)/explore.tsx`: Mapa e Lista de Academias (com Ranking e Ads Patrocinados).
*   `app/(tabs)/competitions.tsx`: Lista de torneios e Leaderboard.
*   `app/(tabs)/profile.tsx`: Gestão de conta, Histórico.
*   `app/academy/[id]`: Detalhe da academia, Reviews, Botão de Check-in.
*   `app/profile/referrals`: Tela "Indique e Ganhe".

### 💻 Web Panel (`gym-panel`)
Lógica baseada em **Next.js App Router**.

*   `/`: Landing Page Institucional.
*   **Dashboard Parceiro (`/dashboard`):**
    *   `/home`: Visão geral (Check-ins de hoje, Receita estimada).
    *   `/reviews`: Gestão de Reputação (Responder comentários).
    *   `/ads`: Gestão de Campanhas (Métricas de Ads).
    *   `/finance`: Extrato de repasses.
*   **Admin Superuser (`/admin`):**
    *   `/admin/payouts`: Engine de Fechamento Financeiro.
    *   `/admin/reviews`: Moderação de Conteúdo.
    *   `/admin/referrals`: Auditoria de Growth.

### 🔌 API Routes (Backend Node.js)
Localizados em `gym-panel/app/api/...`.

*   `/api/webhooks/stripe`: O "Coração Financeiro". Processa pagamentos, libera referrals, ativa ads.
*   `/api/cron/*`: Endpoints para tasks agendadas (se não usar PG_CRON).

---

## 5. 🧩 Módulos de Código (Developer Experience)
Para manter a sanidade no desenvolvimento, usamos **Service Layer Pattern**.

### No Mobile (`fitness-app/services/`)
*   `userService.ts`: Fetch de perfil, update de avatar.
*   `checkinService.ts`: Lógica pesada de Geolocation + QR Code hash.
*   `competitionService.ts`: Join/Leave, Fetch Leaderboards.
*   `reviewService.ts`: Submissão de avaliações.
*   `referralService.ts`: Lógica de códigos e compartilhamento.

### No Web (`gym-panel/services/`)
*   Geralmente usamos Server Components para fetch direto no DB, mas usamos services para lógica client-side complexa.

---

## 6. 🛠️ Integrações Externas
1.  **Stripe:**
    *   `Subscriptions`: Assinatura recorrente dos alunos.
    *   `Customer Balance`: Usado para dar créditos de Referral.
    *   `One-Time Payments`: Usado para compra de Ads (Boost).
2.  **Supabase Auth:** Gerencia Sessão, JWT e integridade de ID.
3.  **Supabase Storage:**
    *   Buckets: `avatars`, `academy-photos`, `academy-logos`.

---

## 7. 🚀 Deploy & DevOps
*   **Docker:** Dockerfiles configurados para `fitness-app` (Web build) e `gym-panel` (Standalone).
*   **CI/CD:** GitHub Actions configurado (`mobile-ci.yml`) para Lint e Testes automáticos.
*   **Verificação:** Script `VERIFY_DEPLOY.sql` atua como Unit Test de Infraestrutura, garantindo que o banco de dados de produção tenha todas as colunas necessárias antes do código subir.

---
**Status Final:** O projeto é um monorepo coeso, com separação clara de responsabilidades, banco de dados blindado por RLS e pronto para escala horizontal.
