# 🎯 Plano de Implementação: MVP 0.5
**Tech Lead:** Antigravity  
**Cliente:** Nicolas Moreira  
**Projeto:** Evolve Fitness Platform  
**Data:** 24/11/2025  
**Versão Atual:** MVP 0.4  
**Versão Alvo:** MVP 0.5

---

## 📊 RESUMO EXECUTIVO

### Objetivo
Transformar o MVP 0.4 em um produto **pronto para mercado** com:
- ✅ Modelo de negócios claro e sustentável (3 modalidades)
- ✅ Engajamento via competições (Gymrats-like)
- ✅ Crescimento orgânico via convites (10% desconto)
- ✅ Controle total via painel admin global
- ✅ Experiência premium para alunos e parceiros

### Prazo Estimado
**12-15 horas de desenvolvimento** (distribuídas em 3-4 sessões)

### Complexidade
**Alta** - Envolve mudanças estruturais no banco, lógica de negócio complexa e múltiplas interfaces.

---

## 🏗️ ARQUITETURA DA SOLUÇÃO

### 1. CAMADA DE DADOS (Supabase)

#### 1.1 Novas Tabelas

```sql
-- Configuração de modalidades e planos
CREATE TABLE modality_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modality_type TEXT NOT NULL, -- 'academia', 'crossfit', 'studio'
  plan_type TEXT NOT NULL, -- 'solo', 'familia', '4x', '6x', 'ilimitado'
  plan_name TEXT NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  max_checkins_per_day INTEGER DEFAULT 1,
  max_checkins_per_week INTEGER,
  repasse_per_checkin DECIMAL(10,2) NOT NULL,
  platform_margin_target DECIMAL(5,2), -- Percentual (ex: 15.00 = 15%)
  requires_reservation BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competições
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  modality_filter TEXT, -- 'academia', 'crossfit', 'studio', 'all'
  scoring_rule TEXT DEFAULT 'total_checkins', -- 'total_checkins', 'streak_days'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'ended', 'cancelled'
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes de competições
CREATE TABLE competition_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  score INTEGER DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, user_id)
);

-- Sistema de convites/referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Quem convidou
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quem foi convidado
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'converted', 'expired'
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recompensas de convites
CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Quem recebe o desconto
  discount_percentage DECIMAL(5,2) DEFAULT 10.00,
  status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'expired'
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações de repasse por parceiro (override)
CREATE TABLE academy_pricing_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  modality_plan_id UUID REFERENCES modality_plans(id) ON DELETE CASCADE,
  custom_repasse DECIMAL(10,2), -- Sobrescreve o padrão se necessário
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academy_id, modality_plan_id)
);
```

#### 1.2 Alterações em Tabelas Existentes

```sql
-- Adicionar campos em 'users'
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES auth.users(id);

-- Adicionar campos em 'memberships'
ALTER TABLE memberships ADD COLUMN modality_plan_id UUID REFERENCES modality_plans(id);

-- Adicionar campos em 'academies'
ALTER TABLE academies ADD COLUMN bank_account_number TEXT;
ALTER TABLE academies ADD COLUMN bank_routing_number TEXT;
ALTER TABLE academies ADD COLUMN cnpj TEXT;
```

#### 1.3 Funções RPC

```sql
-- Calcular repasse dinâmico
CREATE OR REPLACE FUNCTION calculate_checkin_repasse(
  p_user_id UUID,
  p_academy_id UUID,
  p_checkin_date TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_repasse DECIMAL;
  v_modality_plan_id UUID;
BEGIN
  -- Buscar plano do usuário
  SELECT modality_plan_id INTO v_modality_plan_id
  FROM memberships
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- Verificar override específico da academia
  SELECT COALESCE(apo.custom_repasse, mp.repasse_per_checkin)
  INTO v_repasse
  FROM modality_plans mp
  LEFT JOIN academy_pricing_overrides apo 
    ON apo.modality_plan_id = mp.id 
    AND apo.academy_id = p_academy_id
  WHERE mp.id = v_modality_plan_id;

  RETURN COALESCE(v_repasse, 0);
END;
$$ LANGUAGE plpgsql;

-- Atualizar ranking de competição
CREATE OR REPLACE FUNCTION update_competition_rankings(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      cp.id,
      ROW_NUMBER() OVER (ORDER BY cp.score DESC, cp.joined_at ASC) as new_rank
    FROM competition_participants cp
    WHERE cp.competition_id = p_competition_id
      AND cp.status = 'accepted'
  )
  UPDATE competition_participants cp
  SET rank = ranked.new_rank
  FROM ranked
  WHERE cp.id = ranked.id;
END;
$$ LANGUAGE plpgsql;

-- Gerar código de convite único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. CAMADA DE APLICAÇÃO

#### 2.1 App do Aluno (fitness-app)

**Novas Telas:**

1. **Competições** (`app/(tabs)/competitions.tsx`)
   - Lista de competições (minhas, convidado, públicas)
   - Criar competição
   - Ver ranking em tempo real
   - Aceitar/recusar convites

2. **Detalhes da Competição** (`app/competition/[id].tsx`)
   - Informações da competição
   - Ranking atualizado
   - Participantes
   - Progresso pessoal

3. **Indique e Ganhe** (`app/profile/referrals.tsx`)
   - Código/link pessoal
   - Convites enviados
   - Descontos disponíveis
   - Histórico

**Serviços:**
- `src/services/competitionService.ts`
- `src/services/referralService.ts`

#### 2.2 Painel do Parceiro (gym-panel)

**Melhorias:**

1. **Dashboard Financeiro** (`app/dashboard/finance/page.tsx`)
   - Ajustar para usar `calculate_checkin_repasse()`
   - Mostrar repasse por modalidade de plano
   - Gráfico de evolução mensal

2. **Configurações da Academia** (`app/dashboard/settings/page.tsx`)
   - Editar dados bancários
   - Ver modalidade e planos associados

#### 2.3 Painel Admin Global (gym-panel/admin)

**Novas Rotas:**

1. **Gestão de Academias** (`app/admin/academies/page.tsx`)
   - Lista com filtros
   - Criar/editar academia
   - Configurar repasse customizado

2. **Gestão de Alunos** (`app/admin/users/page.tsx`)
   - Lista com filtros
   - Ver detalhes completos
   - Ativar/desativar

3. **Financeiro Global** (`app/admin/finance/page.tsx`)
   - Consolidado por modalidade
   - Exportação CSV
   - Filtros por período

4. **Gestão de Planos** (`app/admin/plans/page.tsx`)
   - CRUD de modality_plans
   - Ajustar preços e repasses

**Middleware:**
- Adicionar verificação de role `admin` ou `super_admin`

---

### 3. INTEGRAÇÕES

#### 3.1 Stripe

**Ajustes:**
- Criar produtos para cada `modality_plan`
- Webhook para aplicar desconto de referral (10%)
- Atualizar preço da assinatura quando houver reward pendente

#### 3.2 Notificações

**Novos Eventos:**
- Convite para competição
- Competição encerrada (ranking final)
- Desconto de referral disponível
- Amigo converteu convite

---

## 📐 CÁLCULOS DE PRICING (CrossFit)

### Plano 4x/semana
- **Uso máximo:** 4 treinos/semana × 4 semanas = 16 treinos/mês
- **Repasse:** R$ 15/treino × 16 = R$ 240
- **Margem alvo:** 15%
- **Preço ideal:** R$ 240 ÷ 0.85 = **R$ 282,35** → **R$ 289,90** (arredondado)

### Plano 6x/semana
- **Uso máximo:** 6 × 4 = 24 treinos/mês
- **Repasse:** R$ 10 × 24 = R$ 240
- **Preço ideal:** R$ 240 ÷ 0.85 = **R$ 282,35** → **R$ 289,90**

### Plano Ilimitado
- **Uso máximo:** 7 × 4 = 28 treinos/mês
- **Repasse:** R$ 9 × 28 = R$ 252
- **Preço ideal:** R$ 252 ÷ 0.85 = **R$ 296,47** → **R$ 299,90**

**Recomendação:** Usar preços escalonados:
- 4x: R$ 249,90
- 6x: R$ 349,90
- Ilimitado: R$ 449,90

Isso cria incentivo para upgrade e melhora margem em planos menores.

---

## 🔄 FLUXOS PRINCIPAIS

### Fluxo 1: Competição

```
1. Usuário A cria competição
   ↓
2. Define regras (período, modalidade, scoring)
   ↓
3. Convida amigos (B, C, D)
   ↓
4. B, C, D recebem notificação
   ↓
5. Aceitam ou recusam
   ↓
6. Durante competição:
   - Check-ins válidos somam pontos
   - Ranking atualiza em tempo real
   ↓
7. Ao final:
   - Status = 'ended'
   - Ranking final gravado
   - Notificação para todos
```

### Fluxo 2: Convite com Desconto

```
1. Usuário A compartilha código/link
   ↓
2. Amigo B cria conta usando código
   ↓
3. B assina plano (Stripe)
   ↓
4. Webhook detecta conversão
   ↓
5. Cria referral_reward para A (10% desconto)
   ↓
6. Na próxima cobrança de A:
   - Aplica desconto via Stripe
   - Marca reward como 'applied'
```

### Fluxo 3: Check-in com Repasse Dinâmico

```
1. Usuário faz check-in (GPS validado)
   ↓
2. Backend chama calculate_checkin_repasse()
   ↓
3. Função busca:
   - modality_plan do usuário
   - override da academia (se houver)
   ↓
4. Retorna valor de repasse
   ↓
5. Grava em checkins.repasse_value
   ↓
6. Dashboard do parceiro reflete valor
```

---

## 📦 ENTREGÁVEIS

### Fase 1: Backend (4-5h)
- [ ] Criar todas as tabelas novas
- [ ] Migrar dados existentes para modality_plans
- [ ] Implementar funções RPC
- [ ] Seed inicial de planos (academia, crossfit, studio)
- [ ] Testes de cálculo de repasse

### Fase 2: App do Aluno (4-5h)
- [ ] Tela de competições (lista + criar)
- [ ] Tela de detalhes da competição
- [ ] Tela "Indique e Ganhe"
- [ ] Serviços de competição e referral
- [ ] Ajustar check-in para considerar limites semanais

### Fase 3: Painel Admin (3-4h)
- [ ] Gestão de academias
- [ ] Gestão de alunos
- [ ] Financeiro global
- [ ] Gestão de planos
- [ ] Middleware de autorização

### Fase 4: Integrações & Ajustes (2h)
- [ ] Webhook Stripe para referral
- [ ] Notificações push (competições, convites)
- [ ] Ajustar painel do parceiro
- [ ] Documentação completa

---

## 🎯 CRITÉRIOS DE SUCESSO

1. ✅ Modelo de pricing configurável por modalidade
2. ✅ Competições funcionando com ranking em tempo real
3. ✅ Sistema de convites com desconto aplicado automaticamente
4. ✅ Painel admin com controle total
5. ✅ Repasse dinâmico funcionando corretamente
6. ✅ Tudo documentado e testável

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Migração de dados existentes | Alto | Criar script de migração com rollback |
| Stripe webhook falhar | Médio | Implementar retry logic + logs |
| Performance do ranking | Médio | Usar materialized view ou cache |
| Complexidade do admin | Alto | Dividir em sprints menores |

---

## 📅 CRONOGRAMA SUGERIDO

**Sessão 1 (3-4h):** Backend completo + seed de dados  
**Sessão 2 (3-4h):** App do aluno (competições + referrals)  
**Sessão 3 (3-4h):** Painel admin  
**Sessão 4 (2-3h):** Integrações, testes e documentação  

**Total:** 12-15 horas

---

## 🚀 PRÓXIMO PASSO

**Aguardando sua aprovação para iniciar a implementação.**

Perguntas para alinhar:
1. Quer começar agora ou prefere agendar?
2. Alguma prioridade específica (ex: competições antes de admin)?
3. Quer ajustar algum preço ou regra antes de implementar?

**Responda e começamos imediatamente!** 💪
