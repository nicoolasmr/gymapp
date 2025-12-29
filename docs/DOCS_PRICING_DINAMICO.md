# 📚 Documentação Técnica: Modelo de Pricing Dinâmico

**Versão:** MVP 0.5.1  
**Data:** 2025-11-24  
**Autor:** Antigravity (Senior Developer)

---

## 🎯 VISÃO GERAL

Este módulo implementa um sistema de **pricing configurável** que permite:
- ✅ Definir planos por modalidade (Academia, CrossFit, Studio)
- ✅ Calcular repasse dinâmico por check-in
- ✅ Customizar repasse por parceiro
- ✅ Validar limites de uso (diário/semanal)
- ✅ Manter histórico de valores

---

## 📊 ESTRUTURA DE DADOS

### Tabela: `modality_plans`

Armazena a configuração de todos os planos disponíveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `modality_type` | TEXT | Tipo: `gym_standard`, `crossfit_box`, `studio` |
| `plan_type` | TEXT | Variante: `solo`, `familia`, `4x`, `6x`, `ilimitado` |
| `plan_name` | TEXT | Nome exibido ao usuário |
| `monthly_price` | DECIMAL | Valor mensal cobrado do usuário |
| `max_checkins_per_day` | INTEGER | Limite diário (padrão: 1) |
| `max_checkins_per_week` | INTEGER | Limite semanal (NULL = ilimitado) |
| `repasse_per_checkin` | DECIMAL | Valor pago à academia por check-in |
| `repasse_min` | DECIMAL | Faixa mínima de repasse (opcional) |
| `repasse_max` | DECIMAL | Faixa máxima de repasse (opcional) |
| `platform_margin_target` | DECIMAL | Margem alvo da plataforma (%) |
| `requires_reservation` | BOOLEAN | Exige reserva prévia (Studio) |
| `allows_family_members` | BOOLEAN | Permite plano família |
| `max_family_members` | INTEGER | Máximo de membros (se família) |
| `is_active` | BOOLEAN | Plano ativo |
| `is_visible` | BOOLEAN | Visível para novos cadastros |
| `stripe_price_id` | TEXT | ID do preço no Stripe |

**Constraint:** `UNIQUE(modality_type, plan_type)`

---

### Tabela: `academy_pricing_overrides`

Permite customizar o repasse para academias específicas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `academy_id` | UUID | FK para `academies` |
| `modality_plan_id` | UUID | FK para `modality_plans` |
| `custom_repasse` | DECIMAL | Repasse customizado (sobrescreve padrão) |
| `override_reason` | TEXT | Motivo do ajuste (auditoria) |
| `is_active` | BOOLEAN | Override ativo |
| `created_by` | UUID | Quem criou o override |

**Constraint:** `UNIQUE(academy_id, modality_plan_id)`

---

## 🔧 FUNÇÕES RPC

### `calculate_checkin_repasse(user_id, academy_id, checkin_date)`

**Objetivo:** Calcular o valor de repasse para um check-in.

**Lógica:**
1. Busca o plano ativo do usuário
2. Verifica se existe override para a academia
3. Retorna o valor customizado OU o padrão do plano

**Retorno:** `DECIMAL` (valor em R$)

**Exemplo:**
```sql
SELECT calculate_checkin_repasse(
    'user-uuid',
    'academy-uuid',
    NOW()
); -- Retorna: 15.00
```

---

### `validate_checkin_limits(user_id, academy_id, checkin_date)`

**Objetivo:** Validar se o usuário pode fazer check-in.

**Lógica:**
1. Verifica se tem plano ativo
2. Conta check-ins do dia
3. Conta check-ins da semana (se houver limite)
4. Retorna JSON com resultado

**Retorno:** `JSON`
```json
{
  "allowed": true,
  "message": "Check-in permitido"
}
```

**Ou em caso de erro:**
```json
{
  "allowed": false,
  "reason": "weekly_limit_reached",
  "message": "Você já atingiu o limite de check-ins desta semana",
  "limit": 4,
  "current": 4,
  "plan_name": "CrossFit 4x/semana"
}
```

---

## 💰 PLANOS CONFIGURADOS

### 🏋️ Academia Convencional

| Plano | Preço | Limite Diário | Limite Semanal | Repasse | Margem |
|-------|-------|---------------|----------------|---------|--------|
| Solo | R$ 149 | 1 | Ilimitado | R$ 9 | 35% |
| Família | R$ 449 | 1 | Ilimitado | R$ 9 | 35% |

**Faixa de repasse:** R$ 6 - R$ 12 (configurável por academia)

---

### 🎯 CrossFit / Box

| Plano | Preço | Limite Semanal | Repasse | Margem Estimada |
|-------|-------|----------------|---------|-----------------|
| 4x/semana | R$ 249,90 | 4 | R$ 15 | ~40% |
| 6x/semana | R$ 349,90 | 6 | R$ 10 | ~31% |
| Ilimitado | R$ 449,90 | Ilimitado | R$ 9 | ~44% |

**Cálculo da margem:**
- **4x:** Uso máximo = 16 treinos/mês → Repasse = R$ 240 → Margem = R$ 9,90 (4%)
- **6x:** Uso máximo = 24 treinos/mês → Repasse = R$ 240 → Margem = R$ 109,90 (31%)
- **Ilimitado:** Uso máximo = 28 treinos/mês → Repasse = R$ 252 → Margem = R$ 197,90 (44%)

> **Nota:** Margem real depende do uso efetivo. Cálculos assumem uso máximo.

---

### 🧘 Studio (Pilates, Yoga, Dança, Lutas)

| Plano | Preço | Limite Semanal | Repasse | Margem |
|-------|-------|----------------|---------|--------|
| Solo | R$ 300 | 2 aulas | R$ 37,50 | 30% |
| Família | R$ 1.000 | 2 aulas | R$ 37,50 | 30% |

**Faixa de repasse:** R$ 25 - R$ 50 (configurável por estúdio)

**Características:**
- ✅ Exige reserva prévia (`requires_reservation = true`)
- ✅ Máximo 2 aulas por semana (~8 aulas/mês)

---

## 🔐 SEGURANÇA (RLS)

### Políticas Implementadas:

1. **Visualização de Planos:**
   - Qualquer usuário autenticado pode ver planos ativos e visíveis
   
2. **Modificação de Planos:**
   - Apenas usuários com role `admin` ou `super_admin`

3. **Overrides de Pricing:**
   - Admins podem ver todos
   - Donos de academia veem apenas os da sua academia

---

## 🔄 FLUXO DE CHECK-IN COM REPASSE

```
1. Usuário solicita check-in
   ↓
2. Sistema chama validate_checkin_limits()
   ↓
3. Se permitido:
   ↓
4. Valida GPS (já existente)
   ↓
5. Cria registro em checkins
   ↓
6. Chama calculate_checkin_repasse()
   ↓
7. Grava repasse_value no checkin
   ↓
8. Dashboard do parceiro reflete valor
```

---

## 📈 MIGRAÇÃO DE DADOS EXISTENTES

A migração automaticamente:
1. ✅ Vincula memberships existentes aos novos planos
2. ✅ Calcula repasse para check-ins históricos
3. ✅ Mantém compatibilidade com sistema antigo

**Lógica de mapeamento:**
- Planos com "solo" no nome → `gym_standard.solo`
- Planos com "família" no nome → `gym_standard.familia`

---

## 🧪 COMO TESTAR

### Teste 1: Verificar Planos Criados
```sql
SELECT 
    modality_type,
    plan_type,
    plan_name,
    monthly_price,
    repasse_per_checkin,
    max_checkins_per_week
FROM modality_plans
WHERE is_active = true
ORDER BY modality_type, monthly_price;
```

### Teste 2: Calcular Repasse
```sql
-- Substitua pelos UUIDs reais
SELECT calculate_checkin_repasse(
    'user-id-aqui',
    'academy-id-aqui',
    NOW()
) as repasse_calculado;
```

### Teste 3: Validar Limites
```sql
SELECT validate_checkin_limits(
    'user-id-aqui',
    'academy-id-aqui',
    NOW()
);
```

### Teste 4: Criar Override Customizado
```sql
-- Exemplo: Box quer pagar R$ 18 em vez de R$ 15
INSERT INTO academy_pricing_overrides (
    academy_id,
    modality_plan_id,
    custom_repasse,
    override_reason
) VALUES (
    'academy-uuid',
    (SELECT id FROM modality_plans WHERE plan_type = '4x' LIMIT 1),
    18.00,
    'Parceria especial - box premium'
);
```

---

## 🚨 ROLLBACK

Se precisar reverter a migração, execute o script comentado no final do arquivo SQL.

**⚠️ ATENÇÃO:** Rollback remove todas as tabelas e dados criados!

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Executar migração no Supabase
2. ✅ Testar funções RPC
3. ⏳ Ajustar painel do parceiro para usar novo cálculo
4. ⏳ Ajustar app para validar limites semanais
5. ⏳ Integrar com Stripe (criar produtos)

---

**Status:** ✅ **PRONTO PARA EXECUÇÃO**
