# ⭐ Sistema de Avaliações e Reputação (Reviews v2)

## Visão Geral
O sistema permite que usuários avaliem academias com nota (1-5), comentários e tags. Inclui moderação, votação de utilidade e cálculo de ranking ponderado.

## Estrutura de Dados

### `academy_reviews`
*   Tabela principal.
*   `status`: `published` (padrão), `hidden` (oculto por admin), `flagged` (denunciado).
*   Anti-Fraude: Trigger `check_review_eligibility` exige check-in nos últimos 30 dias.

### `review_votes`
*   Engajamento.
*   `vote_type`: `helpful` (like) ou `report`.
*   Trigger atualiza contador `helpful_count` na review principal.

### `mv_academy_rankings` (Materialized View)
*   Tabela de cache para listagens de alta performance.
*   **Algoritmo de Ranking:** Bayesian Average.
    *   Fórmula: `(C * m + SUM(rating)) / (C + count)`
    *   `C` (Confidence): 5 (peso de "5 votos fictícios")
    *   `m` (Mean): 4.5 (média ideal esperada)
    *   **Objetivo:** Evitar que uma academia com 1 voto de 5.0 fique acima de uma com 100 votos de 4.9.

## Fluxos

### Avaliação
1.  Usuário faz Check-in.
2.  App convida para avaliar.
3.  Usuário submete (Service valida elegibilidade).

### Moderação
1.  Usuário ou Sistema reporta review.
2.  Admin acessa `/admin/reviews`.
3.  Admin decide: `Approve` ou `Hide`.
4.  App filtra automaticamente (`status='published'`).

### Atualização de Ranking
*   A View `mv_academy_rankings` deve ser atualizada periodicamente.
*   Método manual: `SELECT refresh_academy_rankings();`
*   Método automático: Configurar pg_cron ou Trigger (Trigger "Lazy" recomendado para não travar inserts).

## APIs e Permissões
*   **Public:** Ler reviews publicados.
*   **Auth User:** Criar reviews, Votar.
*   **Partner:** Responder reviews (`reply_to_review`).
*   **Admin:** Gerenciar status de qualquer review.
