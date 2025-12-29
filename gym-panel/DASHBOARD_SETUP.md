# 📊 Dashboard Inteligente - Setup Guide

Este guia explica como configurar o sistema de métricas do dashboard.

## 🗄️ 1. Configurar Função RPC no Supabase

### Passo 1: Acessar o SQL Editor

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor** no menu lateral
3. Clique em **New Query**

### Passo 2: Executar o SQL

Copie e cole o conteúdo do arquivo `/gym-panel/supabase/functions/dashboard_metrics.sql` no editor SQL e execute.

Isso criará a função `get_dashboard_metrics(p_academy_id UUID)` que retorna todas as métricas em uma única chamada.

### Passo 3: Verificar a Função

Execute este comando para testar:

```sql
SELECT get_dashboard_metrics('YOUR-ACADEMY-UUID-HERE');
```

Você deve receber um JSON com a seguinte estrutura:

```json
{
  "today": {
    "total_checkins": 0,
    "unique_users": 0,
    "peak_hour": 0,
    "modality_usage": []
  },
  "week": {
    "total_checkins": 0,
    "unique_users": 0,
    "checkins_by_day": [
      { "date": "2025-12-01", "count": 0 },
      ...
    ]
  },
  "health": {
    "avg_daily_last_30": 0.00,
    "avg_daily_last_7": 0.00,
    "churn_risk": false,
    "trend": "stable"
  },
  "financial": {
    "estimated_revenue_week": 0.00,
    "most_popular_plan": "N/A",
    "avg_ticket": 0.00
  }
}
```

## 🎨 2. Componentes Criados

### BarChart
Componente reutilizável para exibir gráficos de barras.

**Localização:** `/gym-panel/components/BarChart.tsx`

**Uso:**
```tsx
<BarChart 
  data={[
    { date: '2025-12-01', count: 10 },
    { date: '2025-12-02', count: 15 }
  ]} 
  height={200}
  barColor="#2563eb"
  hoverColor="#1d4ed8"
/>
```

### HealthIndicator
Exibe o status de saúde da academia (engajamento).

**Localização:** `/gym-panel/components/HealthIndicator.tsx`

**Uso:**
```tsx
<HealthIndicator 
  trend="up" // 'up' | 'down' | 'stable'
  avgLast7={12.5}
  avgLast30={10.2}
/>
```

### AlertCard
Cartões de alerta para notificações importantes.

**Localização:** `/gym-panel/components/AlertCard.tsx`

**Uso:**
```tsx
<AlertCard 
  type="danger" // 'warning' | 'danger' | 'success'
  title="Queda de engajamento detectada"
  description="A média de check-ins está abaixo do esperado."
/>
```

## 🚀 3. Como Funciona

### Fluxo de Dados

1. **Frontend** (`/dashboard/page.tsx`) chama `get_my_academy()` para obter o ID da academia
2. **Frontend** chama `get_dashboard_metrics(academy_id)` - **UMA ÚNICA CHAMADA**
3. **Supabase RPC** processa todas as métricas no backend
4. **Frontend** recebe JSON completo e renderiza os componentes

### Performance

- ✅ **Uma única chamada** ao banco de dados
- ✅ Todas as queries são executadas no servidor (Supabase)
- ✅ Resposta típica: **< 150ms**
- ✅ Dados em tempo real via Realtime subscriptions

### Realtime Updates

O dashboard se atualiza automaticamente quando há novos check-ins:

```typescript
const channel = supabase
  .channel('checkins_realtime')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'checkins' 
  }, () => {
    fetchDashboardData(); // Recarrega métricas
  })
  .subscribe();
```

## 📊 4. Métricas Disponíveis

### Hoje
- **total_checkins**: Total de check-ins hoje
- **unique_users**: Usuários únicos que fizeram check-in hoje
- **peak_hour**: Hora com mais check-ins (0-23)
- **modality_usage**: Array de modalidades mais usadas

### Semana (últimos 7 dias)
- **total_checkins**: Total de check-ins
- **unique_users**: Usuários únicos
- **checkins_by_day**: Array com contagem por dia

### Saúde
- **avg_daily_last_30**: Média diária dos últimos 30 dias
- **avg_daily_last_7**: Média diária dos últimos 7 dias
- **churn_risk**: Boolean indicando risco de queda
- **trend**: 'up', 'down' ou 'stable'

### Financeiro
- **estimated_revenue_week**: Receita estimada (R$)
- **most_popular_plan**: Plano mais popular ('Solo' ou 'Família')
- **avg_ticket**: Ticket médio por usuário

## 🔧 5. Customização

### Ajustar Cálculo de Receita

Atualmente, a receita é calculada como `check-ins × R$ 15`. Para usar valores reais dos planos:

Edite a função SQL em `dashboard_metrics.sql`:

```sql
-- Substituir esta linha:
v_estimated_revenue_week := v_total_checkins_week * 15.0;

-- Por algo como:
SELECT SUM(
  CASE 
    WHEN m.plan_id = 1 THEN 99.90 / 30  -- Solo: R$ 99,90/mês
    WHEN m.plan_id = 2 THEN 179.90 / 30 -- Família: R$ 179,90/mês
    ELSE 0
  END
)
INTO v_estimated_revenue_week
FROM checkins c
JOIN memberships m ON c.user_id = m.user_id
WHERE c.academy_id = p_academy_id
  AND c.created_at >= v_week_start;
```

### Adicionar Novas Métricas

1. Edite a função SQL `get_dashboard_metrics`
2. Adicione novos campos ao JSON de retorno
3. Atualize a interface `DashboardMetrics` no frontend
4. Renderize os novos dados no componente

## ⚠️ 6. Troubleshooting

### Erro: "function get_dashboard_metrics does not exist"
- Certifique-se de ter executado o SQL no Supabase
- Verifique se a função foi criada com `GRANT EXECUTE ... TO authenticated`

### Métricas retornando 0
- Verifique se há check-ins no banco de dados
- Confirme que o `academy_id` está correto
- Execute a query SQL manualmente para debug

### Dashboard não atualiza em tempo real
- Verifique se o Realtime está habilitado no Supabase
- Confirme que a tabela `checkins` tem Realtime ativo
- Verifique o console do navegador para erros

## 📝 7. Próximos Passos

- [ ] Adicionar cache de métricas (Redis ou similar)
- [ ] Implementar exportação de relatórios (PDF/CSV)
- [ ] Criar dashboard comparativo (mês a mês)
- [ ] Adicionar previsões com ML
- [ ] Implementar notificações push para alertas
