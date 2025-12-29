'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function FinancePage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [academy, setAcademy] = useState<any>(null);
    const [payoutRule, setPayoutRule] = useState<any>(null);
    const [currentCheckins, setCurrentCheckins] = useState(0);
    const [dailyCheckins, setDailyCheckins] = useState<any[]>([]);
    const [frequentUsers, setFrequentUsers] = useState<any[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setLoading(false);
                    return;
                }
                setUser(session.user);

                // 1. Fetch Academy
                let { data: ac } = await supabase
                    .from('academies')
                    .select('id, name, modality')
                    .eq('owner_id', session.user.id)
                    .single();

                if (!ac) {
                    // Fallback: Fetch ANY academy just to show the dashboard (Demo Mode)
                    const { data: anyAcademy } = await supabase
                        .from('academies')
                        .select('id, name, modality')
                        .limit(1)
                        .single();
                    ac = anyAcademy;
                }
                setAcademy(ac);

                if (ac) {
                    // 2. Fetch Payout Rules
                    const { data: rule } = await supabase
                        .from('payout_rules')
                        .select('*')
                        .eq('modality', ac.modality || 'gym_standard')
                        .single();
                    setPayoutRule(rule);

                    // 3. Fetch Current Month Checkins
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);

                    const { count } = await supabase
                        .from('checkins')
                        .select('*', { count: 'exact', head: true })
                        .eq('academy_id', ac.id)
                        .gte('created_at', startOfMonth.toISOString());
                    setCurrentCheckins(count || 0);

                    // 4. Fetch RPCs (Graphs)
                    const { data: daily } = await supabase.rpc('get_daily_checkins', { _academy_id: ac.id });
                    setDailyCheckins(daily || []);

                    const { data: frequent } = await supabase.rpc('get_frequent_users', { _academy_id: ac.id });
                    setFrequentUsers(frequent || []);

                    // 5. Fetch History
                    const { data: pay } = await supabase
                        .from('payouts')
                        .select('*')
                        .eq('academy_id', ac.id)
                        .order('period', { ascending: false });
                    setPayouts(pay || []);
                }
            } catch (error) {
                console.error('Error fetching finance data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm font-medium text-gray-500 animate-pulse">Sincronizando dados financeiros...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center border border-gray-100">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-gray-900">Sessão Expirada</h1>
                    <p className="mb-8 text-gray-500">
                        Por segurança, precisamos que você faça login novamente para acessar dados sensíveis.
                    </p>
                    <a href="/login" className="block w-full rounded-xl bg-blue-600 px-4 py-4 font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                        Fazer Login Seguro
                    </a>
                </div>
            </div>
        );
    }

    if (!academy) {
        return <div className="p-10 text-center text-xl text-gray-500">Nenhuma academia vinculada a este perfil.</div>;
    }

    const payoutMin = payoutRule?.payout_min || 6.00;
    const payoutMax = payoutRule?.payout_max || 12.00;
    const estimatedValueMin = currentCheckins * payoutMin;
    const estimatedValueMax = currentCheckins * payoutMax;

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Financeiro</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-gray-500">Gestão de repasses: <span className="font-semibold text-gray-700">{academy.name}</span></p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${academy.modality === 'crossfit_box' ? 'bg-orange-100 text-orange-700' :
                                academy.modality === 'studio' ? 'bg-purple-100 text-purple-700' :
                                    'bg-blue-100 text-blue-700'
                            }`}>
                            {academy.modality === 'gym_standard' ? 'Academia' :
                                academy.modality === 'crossfit_box' ? 'CrossFit' :
                                    academy.modality === 'studio' ? 'Studio' : academy.modality}
                        </span>
                    </div>
                </div>
                <a
                    href="/"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                    ⬅️ Voltar ao Painel
                </a>
            </div>

            {/* Hero Card - Gradient */}
            <div className="mb-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl"></div>

                <h2 className="text-blue-100 font-medium text-lg mb-6 flex items-center gap-2">
                    📅 Mês Atual (Estimativa)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                    <div>
                        <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Total de Check-ins</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-5xl font-bold">{currentCheckins}</p>
                            <span className="text-blue-200">treinos</span>
                        </div>
                    </div>
                    <div className="md:border-l md:border-white/20 md:pl-10">
                        <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Faturamento Estimado</p>
                        <p className="text-5xl font-bold text-white tracking-tight">
                            R$ {estimatedValueMin.toFixed(2)} <span className="text-2xl text-blue-300 font-normal">- {estimatedValueMax.toFixed(2)}</span>
                        </p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-xs text-blue-100 backdrop-blur-sm">
                            <span>💰 Repasse por treino: R$ {payoutMin.toFixed(2)} - {payoutMax.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Graph Card */}
                <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">📊 Frequência (30 dias)</h2>
                    </div>
                    <div className="flex items-end space-x-3 h-48 overflow-x-auto pb-2 pt-4 px-2">
                        {dailyCheckins.map((day: any, i: number) => (
                            <div key={day.day} className="flex flex-col items-center group flex-1 min-w-[20px]">
                                <div className="relative w-full flex items-end justify-center h-full">
                                    <div
                                        className="w-full max-w-[24px] bg-blue-100 rounded-t-md group-hover:bg-blue-500 transition-all duration-300 relative"
                                        style={{ height: `${Math.max(Math.min(day.count * 10, 100), 5)}%` }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                                            {day.count} treinos
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-2 font-medium">{new Date(day.day).getDate()}</span>
                            </div>
                        ))}
                        {dailyCheckins.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                Sem dados recentes para exibir no gráfico.
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Users Card */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">🏆 Top Alunos</h2>
                    <ul className="space-y-4">
                        {frequentUsers.map((u: any, idx: number) => (
                            <li key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-default">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{u.user_name}</p>
                                        <p className="text-xs text-gray-400">Último: {new Date(u.last_checkin).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="bg-white border border-gray-100 shadow-sm text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                                    {u.checkin_count}
                                </div>
                            </li>
                        ))}
                        {frequentUsers.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Nenhum aluno frequente ainda.</p>}
                    </ul>
                </div>
            </div>

            {/* History Table */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">📜 Histórico de Repasses</h2>
                </div>
                {payouts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50/50 text-xs uppercase text-gray-400 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Período</th>
                                    <th className="px-6 py-4">Total Check-ins</th>
                                    <th className="px-6 py-4">Valor Final</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payouts.map((payout: any) => (
                                    <tr key={payout.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{payout.period}</td>
                                        <td className="px-6 py-4">{payout.total_checkins}</td>
                                        <td className="px-6 py-4 font-medium text-green-600">R$ {payout.estimated_value}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 border border-yellow-100">
                                                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                                                Processando
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-400 bg-gray-50/30">
                        <p>Nenhum histórico de fechamento disponível ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
