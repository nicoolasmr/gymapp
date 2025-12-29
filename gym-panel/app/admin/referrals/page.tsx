'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface ReferralStat {
    referrer_id: string;
    referrer_email: string;
    total_invites: number;
    total_converted: number;
    total_earned_cents: number;
}

export default function AdminReferralsPage() {
    const [stats, setStats] = useState<ReferralStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalActive: 0, totalPaid: 0 });
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('view_referral_performance')
                .select('*')
            // .limit(50) // Pagination later

            if (error) throw error;
            setStats(data || []);

            // Calc summary
            const totalActive = data?.reduce((acc, curr) => acc + curr.total_converted, 0) || 0;
            const totalPaid = data?.reduce((acc, curr) => acc + curr.total_earned_cents, 0) || 0;
            setSummary({ totalActive, totalPaid });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Carregando dados de indicações...</div>;
    }

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Indicações</h1>
                <p className="text-gray-600">Acompanhe o desempenho do programa de Referral e pagamentos de bônus.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                        <Users className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{summary.totalActive}</div>
                        <div className="text-sm text-gray-500">Novos Assinantes</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                        <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">R$ {(summary.totalPaid / 100).toFixed(2)}</div>
                        <div className="text-sm text-gray-500">Bônus Distribuídos</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">10%</div>
                        <div className="text-sm text-gray-500">Custo de Aquisição (CAC)</div>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-gray-900">Top Indicadores</h2>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
                        <tr>
                            <th className="p-4 font-medium">Usuário (Indicador)</th>
                            <th className="p-4 font-medium">Convites Enviados</th>
                            <th className="p-4 font-medium">Convertidos (Assinaram)</th>
                            <th className="p-4 font-medium">Ganhos Totais</th>
                            <th className="p-4 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {stats.map((stat) => (
                            <tr key={stat.referrer_id} className="hover:bg-gray-50">
                                <td className="p-4">
                                    <div className="font-medium text-gray-900">{stat.referrer_email || 'Email Oculto'}</div>
                                    <div className="text-xs text-gray-400">{stat.referrer_id}</div>
                                </td>
                                <td className="p-4 text-gray-600">{stat.total_invites}</td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {stat.total_converted}
                                    </span>
                                </td>
                                <td className="p-4 font-bold text-green-600">
                                    R$ {(stat.total_earned_cents / 100).toFixed(2)}
                                </td>
                                <td className="p-4">
                                    {stat.total_earned_cents > 0 ? (
                                        <span className="text-green-600 text-sm flex items-center gap-1">
                                            <DollarSign size={14} /> Pago
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-sm">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {stats.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    Nenhuma indicação registrada ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
