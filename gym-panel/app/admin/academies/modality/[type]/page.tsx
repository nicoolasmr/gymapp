'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ModalityDrillDown({ params }: { params: { type: string } }) {
    const router = useRouter();
    const [academies, setAcademies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    const modalityNames: any = {
        'gym_standard': 'Academias',
        'crossfit_box': 'CrossFit Boxes',
        'studio': 'Studios',
    };

    useEffect(() => {
        fetchAcademies();
    }, [params.type]);

    const fetchAcademies = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_academy_metrics')
                .select('*')
                .eq('modality', params.type)
                .order('name');

            if (error) throw error;
            setAcademies(data || []);
        } catch (error) {
            console.error('Erro ao carregar academias:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ['Nome', 'Endereço', 'Status', 'Alunos Ativos', 'Check-ins (Mês)', 'Repasse (Mês)', 'Margem (Mês)'];
        const rows = academies.map(a => [
            a.name,
            a.address,
            a.active ? 'Ativa' : 'Inativa',
            a.total_active_members || 0,
            a.checkins_this_month || 0,
            `R$ ${(a.total_repasse_month || 0).toFixed(2)}`,
            `R$ ${(a.platform_margin_month || 0).toFixed(2)}`
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${params.type}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 mb-2">
                        ← Voltar
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{modalityNames[params.type] || params.type}</h1>
                    <p className="text-gray-600 mt-2">{academies.length} academias encontradas</p>
                </div>
                <div className="space-x-4">
                    <button
                        onClick={exportCSV}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        📊 Exportar CSV
                    </button>
                    <Link
                        href="/admin/academies/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                        ➕ Adicionar Academia
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Total de Academias</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{academies.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Ativas</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                        {academies.filter(a => a.active).length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Repasse Total (Mês)</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                        R$ {academies.reduce((sum, a) => sum + (a.total_repasse_month || 0), 0).toFixed(2)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Margem Total (Mês)</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                        R$ {academies.reduce((sum, a) => sum + (a.platform_margin_month || 0), 0).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Academia</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Alunos</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Check-ins (Mês)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Repasse (Mês)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Margem (Mês)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {academies.map((academy) => (
                            <tr key={academy.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div>
                                        <div className="font-medium text-gray-900">{academy.name}</div>
                                        <div className="text-sm text-gray-500">{academy.address}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${academy.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {academy.active ? 'Ativa' : 'Inativa'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-900 font-medium">
                                    {academy.total_active_members || 0}
                                </td>
                                <td className="px-6 py-4 text-gray-900">
                                    {academy.checkins_this_month || 0}
                                </td>
                                <td className="px-6 py-4 text-orange-600 font-medium">
                                    R$ {(academy.total_repasse_month || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-blue-600 font-bold">
                                    R$ {(academy.platform_margin_month || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4">
                                    <Link
                                        href={`/admin/academies/${academy.id}`}
                                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                    >
                                        Editar
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {academies.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        Nenhuma academia encontrada nesta modalidade.
                    </div>
                )}
            </div>
        </div>
    );
}
