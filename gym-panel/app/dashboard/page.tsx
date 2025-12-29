'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Checkin } from '@/types';
import { Calendar, Users, Clock, Dumbbell, TrendingUp, DollarSign, CreditCard, Loader2 } from 'lucide-react';
import BarChart from '@/components/BarChart';
import HealthIndicator from '@/components/HealthIndicator';
import AlertCard from '@/components/AlertCard';
import InsightsPanel from '@/components/InsightsPanel';

interface DashboardMetrics {
    today: {
        total_checkins: number;
        unique_users: number;
        peak_hour: number;
        modality_usage: { name: string; count: number }[];
    };
    week: {
        total_checkins: number;
        unique_users: number;
        checkins_by_day: { date: string; count: number }[];
    };
    health: {
        avg_daily_last_30: number;
        avg_daily_last_7: number;
        churn_risk: boolean;
        trend: 'up' | 'down' | 'stable';
    };
    financial: {
        estimated_revenue_week: number;
        most_popular_plan: string;
        avg_ticket: number;
    };
}

interface AcademyInsights {
    engagement: {
        status: 'rising' | 'falling' | 'stable';
        percent_change: number;
        message: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    };
    peak_hours: {
        busiest_hour: string;
        slowest_hour: string;
        message: string;
    };
    modalities: {
        most_popular: string;
        least_popular: string;
        message: string;
    };
    predictions: {
        tomorrow_estimated_checkins: number;
        message: string;
    };
    suggestions: string[];
}

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [insights, setInsights] = useState<AcademyInsights | null>(null);
    const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get academy ID
            const { data: academy } = await supabase.rpc('get_my_academy').maybeSingle();
            if (!academy || !(academy as any).id) return;

            // Fetch metrics from RPC function
            const { data: metricsData, error: metricsError } = await supabase
                .rpc('get_dashboard_metrics', { p_academy_id: (academy as any).id })
                .single();

            if (metricsError) {
                console.error('Error fetching metrics:', metricsError);
                // Fallback to empty metrics
                setMetrics({
                    today: { total_checkins: 0, unique_users: 0, peak_hour: 0, modality_usage: [] },
                    week: { total_checkins: 0, unique_users: 0, checkins_by_day: [] },
                    health: { avg_daily_last_30: 0, avg_daily_last_7: 0, churn_risk: false, trend: 'stable' },
                    financial: { estimated_revenue_week: 0, most_popular_plan: 'N/A', avg_ticket: 0 }
                });
            } else {
                setMetrics(metricsData as DashboardMetrics);
            }

            // Fetch recent checkins for the table
            const { data: checkinsData } = await supabase
                .from('checkins')
                .select('*, users(full_name, email)')
                .eq('academy_id', (academy as any).id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (checkinsData) {
                setRecentCheckins(checkinsData as unknown as Checkin[]);
            }

            // Fetch insights
            const { data: insightsData, error: insightsError } = await supabase
                .rpc('get_academy_insights', { p_academy_id: (academy as any).id })
                .single();

            if (!insightsError && insightsData) {
                setInsights(insightsData as AcademyInsights);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        // Realtime subscription
        const channel = supabase
            .channel('checkins_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="p-8">
                <div className="text-center text-gray-500">Erro ao carregar métricas</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Visão geral da sua academia em tempo real</p>
            </div>

            {/* Seção 1: Resumo do Dia */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Hoje</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Check-ins Hoje"
                        value={metrics.today.total_checkins}
                        icon={Calendar}
                    />
                    <MetricCard
                        title="Usuários Únicos"
                        value={metrics.today.unique_users}
                        icon={Users}
                    />
                    <MetricCard
                        title="Horário de Pico"
                        value={metrics.today.peak_hour > 0 ? `${metrics.today.peak_hour}h` : 'N/A'}
                        icon={Clock}
                    />
                    <MetricCard
                        title="Modalidade Popular"
                        value={metrics.today.modality_usage[0]?.name || 'N/A'}
                        icon={Dumbbell}
                    />
                </div>
            </div>

            {/* Seção 2: Semana */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">📅 Últimos 7 Dias</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-base font-bold text-gray-900 mb-6">Check-ins por Dia</h3>
                        <BarChart data={metrics.week.checkins_by_day} height={200} />
                    </div>
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total na Semana</h3>
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{metrics.week.total_checkins}</div>
                            <p className="text-xs text-gray-400 mt-1">Check-ins nos últimos 7 dias</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Usuários Únicos</h3>
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{metrics.week.unique_users}</div>
                            <p className="text-xs text-gray-400 mt-1">Visitantes diferentes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção 3: Saúde da Academia */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">💚 Saúde da Academia</h2>
                <div className="space-y-4">
                    <HealthIndicator
                        trend={metrics.health.trend}
                        avgLast7={metrics.health.avg_daily_last_7}
                        avgLast30={metrics.health.avg_daily_last_30}
                    />

                    {/* Alertas Automáticos */}
                    {metrics.health.churn_risk && (
                        <AlertCard
                            type="danger"
                            title="Queda de engajamento detectada"
                            description={`A média de check-ins dos últimos 7 dias (${metrics.health.avg_daily_last_7.toFixed(1)}/dia) está abaixo da média mensal (${metrics.health.avg_daily_last_30.toFixed(1)}/dia). Considere criar um desafio ou promoção.`}
                        />
                    )}

                    {metrics.health.trend === 'up' && (
                        <AlertCard
                            type="success"
                            title="Engajamento em alta!"
                            description="Sua academia está com movimento acima da média. Continue com o bom trabalho!"
                        />
                    )}

                    {metrics.today.total_checkins < 5 && (
                        <AlertCard
                            type="warning"
                            title="Poucos check-ins hoje"
                            description="O movimento está abaixo do esperado. Que tal enviar uma mensagem motivacional para os alunos?"
                        />
                    )}
                </div>
            </div>

            {/* Seção 4: Financeiro */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">💰 Financeiro</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg text-white">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-blue-100 uppercase tracking-wider">Receita Estimada</h3>
                            <DollarSign className="w-5 h-5 text-blue-200" />
                        </div>
                        <div className="text-3xl font-bold">R$ {metrics.financial.estimated_revenue_week.toFixed(2)}</div>
                        <p className="text-xs text-blue-200 mt-1">Últimos 7 dias</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Plano Popular</h3>
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{metrics.financial.most_popular_plan}</div>
                        <p className="text-xs text-gray-400 mt-1">Mais escolhido</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ticket Médio</h3>
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                            R$ {metrics.financial.avg_ticket > 0 ? metrics.financial.avg_ticket.toFixed(2) : '0.00'}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Por usuário/semana</p>
                    </div>
                </div>
            </div>

            {/* Seção 5: Insights Inteligentes */}
            <div>
                <InsightsPanel insights={insights} loading={loading} />
            </div>

            {/* Últimos Check-ins */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Últimos Check-ins</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-medium">
                            <tr>
                                <th className="px-6 py-4">Aluno</th>
                                <th className="px-6 py-4">Plano</th>
                                <th className="px-6 py-4">Horário</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentCheckins.map((checkin) => (
                                <tr key={checkin.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {checkin.users?.full_name || 'Usuário'}
                                        <div className="text-xs text-gray-500 font-normal">{checkin.users?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">Standard</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {format(new Date(checkin.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Confirmado
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentCheckins.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum check-in registrado recentemente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>
}) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
        </div>
    );
}
