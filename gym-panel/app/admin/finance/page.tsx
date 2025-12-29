'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AdminFinance() {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchFinance();
    }, []);

    const fetchFinance = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_financial_overview')
                .select('*');

            if (error) throw error;
            setStats(data || []);
        } catch (error) {
            console.error('Erro ao buscar financeiro:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    const totalRevenue = stats.reduce((acc, curr) => acc + (curr.monthly_revenue || 0), 0);
    const totalRepasse = stats.reduce((acc, curr) => acc + (curr.total_repasse || 0), 0);
    const totalMargin = stats.reduce((acc, curr) => acc + (curr.platform_margin || 0), 0);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Financeiro Global</h1>
                    <p className="text-gray-600 mt-2">Visão geral de receitas e repasses deste mês</p>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Receita Bruta (Assinaturas)</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        R$ {totalRevenue.toFixed(2)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Repasse aos Parceiros</h3>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                        R$ {totalRepasse.toFixed(2)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Margem da Plataforma</h3>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                        R$ {totalMargin.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Detalhamento por Modalidade</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Modalidade</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Assinantes</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Check-ins</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Receita</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Repasse</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Margem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {stats.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium capitalize">
                                    {item.modality_type === 'gym_standard' ? 'Academia' :
                                        item.modality_type === 'crossfit_box' ? 'CrossFit' : item.modality_type}
                                </td>
                                <td className="px-6 py-4">{item.total_memberships}</td>
                                <td className="px-6 py-4">{item.total_checkins}</td>
                                <td className="px-6 py-4">R$ {item.monthly_revenue?.toFixed(2) || '0.00'}</td>
                                <td className="px-6 py-4 text-orange-600">R$ {item.total_repasse?.toFixed(2) || '0.00'}</td>
                                <td className="px-6 py-4 font-bold text-green-600">R$ {item.platform_margin?.toFixed(2) || '0.00'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {stats.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        Nenhum dado financeiro encontrado para este mês.
                    </div>
                )}
            </div>
        </div>
    );
}
