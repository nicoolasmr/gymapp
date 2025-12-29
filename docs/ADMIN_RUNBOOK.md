# 🎛️ Admin Runbook: Operações Diárias

## Visão Geral
Este documento é o manual operacional para administradores da plataforma Evolve Fitness. Contém procedimentos, troubleshooting e melhores práticas.

---

## 1. Dashboard Principal (`/admin/overview`)

### Métricas Críticas
- **MRR (Monthly Recurring Revenue):** Receita recorrente mensal
- **Margem da Plataforma:** % que fica após payouts
- **Taxa de Retenção:** Usuários ativos vs inativos

### Alertas Automáticos
- ⚠️ **Usuários Bloqueados > 5%:** Investigar motivo
- ⚠️ **Academias Suspensas > 10%:** Problema sistêmico?
- ⚠️ **Reviews Pendentes > 50:** Moderação atrasada

---

## 2. Gerenciamento de Usuários (`/admin/users`)

### Bloquear Usuário
**Quando:** Fraude confirmada, violação de termos, chargebacks recorrentes.

**Como:**
1. Acessar `/admin/fraud` ou `/admin/users`
2. Clicar em "Bloquear"
3. Informar motivo (obrigatório para auditoria)
4. Confirmar

**Efeito:**
- Usuário não consegue fazer login
- Check-ins bloqueados
- Assinatura cancelada automaticamente (via webhook)

### Desbloquear Usuário
**Quando:** Erro identificado, usuário regularizou situação.

**Como:**
1. Buscar usuário em `/admin/users`
2. Clicar em "Desbloquear"
3. Confirmar

---

## 3. Gerenciamento de Academias (`/admin/academies`)

### Suspender Academia
**Quando:** Violação de contrato, reclamações recorrentes, inadimplência.

**Como:**
1. Acessar `/admin/academies`
2. Clicar em "Suspender"
3. Informar motivo
4. Confirmar

**Efeito:**
- Academia some do mapa/busca
- Usuários não conseguem fazer check-in
- Payouts pausados

### Aprovar Nova Academia
**Quando:** Parceiro completa onboarding.

**Como:**
1. Verificar documentação (CNPJ, fotos, endereço)
2. Validar localização no mapa
3. Aprovar status para `active`

---

## 4. Moderação de Conteúdo (`/admin/reviews`)

### Ocultar Review
**Quando:** Conteúdo ofensivo, spam, fake review.

**Como:**
1. Acessar `/admin/reviews`
2. Ler review completa
3. Clicar em "Ocultar"
4. Review fica `status = 'hidden'` (não aparece no app)

### Aprovar Review Pendente
**Quando:** Sistema marcou como suspeita mas é legítima.

**Como:**
1. Verificar se usuário realmente fez check-in
2. Aprovar manualmente

---

## 5. Fechamento Financeiro (`/admin/payouts`)

### Processo Mensal (Todo dia 1º)
1. **Criar Período:** Ex: "Janeiro 2026"
2. **Recalcular Valores:** Congela números
3. **Simular Payout:** Dry run para validar
4. **Executar Payout:** Transferências via Stripe Connect
5. **Exportar CSV:** Fallback para academias sem Connect

### Troubleshooting
**Erro: "Insufficient funds"**
- Saldo da plataforma no Stripe está negativo
- Adicionar fundos antes de executar

**Transfer Failed**
- Conta bancária inválida
- Entrar em contato com parceiro para atualizar dados

---

## 6. Anti-Fraude (`/admin/fraud`)

### Critérios de Detecção
- **Múltiplas Academias:** > 3 academias no mesmo dia
- **Alta Frequência:** > 20 check-ins em 7 dias
- **Padrão Geográfico:** Check-ins em cidades diferentes em < 1h (futuro)

### Ação Recomendada
1. Analisar histórico do usuário
2. Se confirmar fraude: Bloquear + Cancelar assinatura
3. Se falso positivo: Ignorar alerta

---

## 7. Auditoria (`admin_actions_log`)

Toda ação administrativa é logada automaticamente:
- Quem fez (admin_id)
- O que fez (action_type)
- Quando fez (created_at)
- Motivo (details.reason)

### Consultar Logs
```sql
SELECT * FROM admin_actions_log 
WHERE action_type = 'block_user' 
ORDER BY created_at DESC 
LIMIT 50;
```

---

## 8. Permissões & Segurança

### Níveis de Acesso
- **Superadmin:** Acesso total (role = 'superadmin')
- **Parceiro:** Apenas sua academia (owner_id)
- **Usuário:** Apenas seus dados (auth.uid())

### Threat Model
| Ameaça | Mitigação |
| :--- | :--- |
| **Admin Malicioso** | Audit log rastreia tudo. Revisar logs semanalmente. |
| **Fraude de Check-in** | Detecção automática + validação geolocalização. |
| **Chargeback** | Stripe gerencia. Bloquear usuário após 2º chargeback. |
| **Vazamento de Dados** | RLS ativo em 100% das tabelas. |

---

## 9. Checklist Semanal

- [ ] Revisar `/admin/fraud` (Segunda-feira)
- [ ] Moderar reviews pendentes (Quarta-feira)
- [ ] Processar payouts (Dia 1º do mês)
- [ ] Verificar MRR vs Churn (Sexta-feira)
- [ ] Backup do banco de dados (Automático via Supabase)

---

## 10. Contatos de Emergência

- **Suporte Stripe:** https://support.stripe.com
- **Supabase Status:** https://status.supabase.com
- **Vercel Status:** https://www.vercel-status.com

---

**Última Atualização:** 29/12/2025
**Versão:** 1.0
