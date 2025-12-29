# 🚀 Guia de Execução: Sprint 1 - Pricing Dinâmico

**Versão:** MVP 0.5.1  
**Data:** 2025-11-24

---

## ✅ PRÉ-REQUISITOS

Antes de executar a migração, certifique-se de que:
- [ ] Você tem acesso ao Supabase Dashboard
- [ ] Você tem backup do banco de dados atual
- [ ] Nenhum usuário está fazendo check-in neste momento (opcional, mas recomendado)

---

## 📋 PASSO A PASSO

### 1. FAZER BACKUP DO BANCO (OBRIGATÓRIO)

No Supabase Dashboard:
1. Vá em **Database** → **Backups**
2. Clique em **Create backup**
3. Aguarde conclusão

**Ou via SQL:**
```sql
-- Exportar dados críticos
COPY (SELECT * FROM memberships) TO '/tmp/memberships_backup.csv' CSV HEADER;
COPY (SELECT * FROM checkins) TO '/tmp/checkins_backup.csv' CSV HEADER;
COPY (SELECT * FROM academies) TO '/tmp/academies_backup.csv' CSV HEADER;
```

---

### 2. EXECUTAR MIGRAÇÃO

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Cole o conteúdo do arquivo `MIGRATION_MVP_0_5_PART_1_PRICING.sql`
5. Clique em **Run**

**Tempo estimado:** 10-30 segundos

---

### 3. VERIFICAR EXECUÇÃO

Execute os seguintes comandos para validar:

```sql
-- 1. Verificar planos criados
SELECT COUNT(*) as total_planos FROM modality_plans WHERE is_active = true;
-- Esperado: 7 planos

-- 2. Verificar estrutura
SELECT 
    modality_type,
    COUNT(*) as quantidade
FROM modality_plans
WHERE is_active = true
GROUP BY modality_type;
-- Esperado:
-- gym_standard: 2
-- crossfit_box: 3
-- studio: 2

-- 3. Verificar migração de memberships
SELECT COUNT(*) as memberships_migrados 
FROM memberships 
WHERE modality_plan_id IS NOT NULL;
-- Deve ser > 0 se você já tinha memberships

-- 4. Testar função de cálculo
SELECT calculate_checkin_repasse(
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM academies LIMIT 1),
    NOW()
) as teste_repasse;
-- Deve retornar um valor numérico (ex: 9.00, 15.00)
```

---

### 4. TESTAR FUNÇÕES

#### Teste A: Validação de Limites

```sql
-- Pegar um usuário real
SELECT validate_checkin_limits(
    (SELECT id FROM users WHERE email = 'seu-email@exemplo.com'),
    (SELECT id FROM academies LIMIT 1),
    NOW()
);
```

**Resultado esperado:**
```json
{
  "allowed": true,
  "message": "Check-in permitido"
}
```

#### Teste B: Cálculo de Repasse

```sql
-- Criar um override de teste
INSERT INTO academy_pricing_overrides (
    academy_id,
    modality_plan_id,
    custom_repasse,
    override_reason
) VALUES (
    (SELECT id FROM academies LIMIT 1),
    (SELECT id FROM modality_plans WHERE plan_type = 'solo' LIMIT 1),
    12.00,
    'Teste de override'
);

-- Verificar se o cálculo usa o override
SELECT calculate_checkin_repasse(
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM academies LIMIT 1),
    NOW()
) as repasse_com_override;
-- Deve retornar 12.00

-- Limpar teste
DELETE FROM academy_pricing_overrides WHERE override_reason = 'Teste de override';
```

---

### 5. VERIFICAR DADOS HISTÓRICOS

```sql
-- Verificar se check-ins antigos receberam valor de repasse
SELECT 
    COUNT(*) as total_checkins,
    COUNT(repasse_value) as checkins_com_repasse,
    AVG(repasse_value) as repasse_medio
FROM checkins;
```

**Esperado:**
- `total_checkins` = `checkins_com_repasse`
- `repasse_medio` entre 6.00 e 50.00

---

## 🔍 TROUBLESHOOTING

### Erro: "relation modality_plans already exists"

**Causa:** Migração já foi executada antes.

**Solução:**
```sql
-- Verificar se tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'modality_plans'
);

-- Se retornar true, a migração já foi executada
-- Você pode pular para a verificação
```

---

### Erro: "function calculate_checkin_repasse does not exist"

**Causa:** Parte da migração falhou.

**Solução:**
1. Execute apenas a parte de criação de funções:
```sql
-- Copie apenas as seções STEP 4 e STEP 5 do arquivo de migração
```

---

### Memberships não foram migrados

**Causa:** Nomes dos planos antigos não correspondem ao padrão esperado.

**Solução:**
```sql
-- Ver planos antigos
SELECT DISTINCT p.name 
FROM plans p
JOIN memberships m ON m.plan_id = p.id;

-- Migrar manualmente
UPDATE memberships m
SET modality_plan_id = (SELECT id FROM modality_plans WHERE plan_type = 'solo' LIMIT 1)
WHERE plan_id IN (SELECT id FROM plans WHERE name ILIKE '%solo%')
  AND modality_plan_id IS NULL;
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Marque cada item após validar:

- [ ] Tabela `modality_plans` criada com 7 planos
- [ ] Tabela `academy_pricing_overrides` criada
- [ ] Função `calculate_checkin_repasse()` funciona
- [ ] Função `validate_checkin_limits()` funciona
- [ ] Memberships existentes foram migrados
- [ ] Check-ins históricos têm `repasse_value`
- [ ] RLS policies estão ativas
- [ ] Backup do banco foi feito

---

## 🎯 PRÓXIMOS PASSOS

Após validar tudo:

1. **Ajustar código do app:**
   - Usar `validate_checkin_limits()` antes de permitir check-in
   - Mostrar mensagem de erro se limite atingido

2. **Ajustar painel do parceiro:**
   - Dashboard financeiro usar `calculate_checkin_repasse()`
   - Mostrar breakdown por tipo de plano

3. **Integrar com Stripe:**
   - Criar produtos para cada `modality_plan`
   - Atualizar `stripe_price_id` na tabela

---

## 🆘 EM CASO DE PROBLEMAS

Se algo der errado e você precisar reverter:

```sql
-- ATENÇÃO: Isso apaga TUDO criado nesta migração!
-- Use apenas se realmente necessário

-- Copie e execute o bloco de ROLLBACK do arquivo de migração
-- (está comentado no final do arquivo SQL)
```

---

## 📞 SUPORTE

Se encontrar algum erro não documentado aqui:
1. Copie a mensagem de erro completa
2. Anote qual passo estava executando
3. Verifique os logs do Supabase
4. Entre em contato com o desenvolvedor

---

**Status:** ✅ **PRONTO PARA EXECUÇÃO**

**Tempo total estimado:** 15-20 minutos
