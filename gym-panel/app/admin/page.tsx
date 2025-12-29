'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [modalities, setModalities] = useState<any[]>([]);
    const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchData();

        // Subscribe to real-time check-ins
        const channel = supabase
            .channel('admin-checkins')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        try {
            const [statsData, modalitiesData, checkinsData] = await Promise.all([
                supabase.from('admin_general_stats').select('*').single(),
                supabase.from('admin_modality_summary').select('*'),
                supabase.from('checkins')
                    .select('*, users(full_name, email), academies(name)')
                    .order('created_at', { ascending: false })
                    .limit(10)
            ]);

            setStats(statsData.data);
            setModalities(modalitiesData.data || []);
            setRecentCheckins(checkinsData.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const statCards = [
        { label: 'Usuários Totais', value: stats?.total_users || 0, icon: '👥', color: 'blue' },
        { label: 'Academias Ativas', value: stats?.total_academias || 0, icon: '🏋️', color: 'green' },
        { label: 'Assinaturas Ativas', value: stats?.active_memberships || 0, icon: '💳', color: 'purple' },
        { label: 'Check-ins Hoje', value: stats?.checkins_today || 0, icon: '✅', color: 'orange' },
    ];

    const modalityConfig: any = {
        'gym_standard': { name: 'Academias', icon: '🏋️', color: 'blue' },
        'crossfit_box': { name: 'CrossFit', icon: '💪', color: 'red' },
        'studio': { name: 'Studios', icon: '🧘', color: 'purple' },
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Global</h1>
                <p className="text-gray-600 mt-2">Visão geral da plataforma</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((card, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                            </div>
                            <div className="text-4xl">{card.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modalities Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Academias por Modalidade</h2>
                    <Link
                        href="/admin/academies/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        ➕ Adicionar Academia
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {modalities.map((mod) => {
                        const config = modalityConfig[mod.modality] || { name: mod.modality, icon: '🏢', color: 'gray' };
                        return (
                            <Link
                                key={mod.modality}
                                href={`/admin/academies/modality/${mod.modality}`}
                                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{config.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {mod.active_academies} de {mod.total_academies} ativas
                                        </p>
                                    </div>
                                    <div className="text-4xl">{config.icon}</div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Alunos Ativos:</span>
                                        <span className="font-bold text-gray-900">{mod.total_members || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Receita Mensal:</span>
                                        <span className="font-bold text-green-600">
                                            R$ {(mod.total_revenue_month || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <span className="text-blue-600 text-sm font-medium">
                                        Ver detalhes →
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Check-ins Global Section */}
            <div className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Últimos Check-ins (Global)</h3>
                    <p className="text-sm text-gray-500">Acompanhamento em tempo real de toda a rede</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-medium">
                            <tr>
                                <th className="px-6 py-4">Aluno</th>
                                <th className="px-6 py-4">Academia</th>
                                <th className="px-6 py-4">Horário</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentCheckins.map((checkin: any) => (
                                <tr key={checkin.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {checkin.users?.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div>{checkin.users?.full_name || 'Usuário Desconhecido'}</div>
                                                <div className="text-xs text-gray-500 font-normal">{checkin.users?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="font-medium text-gray-900">{checkin.academies?.name || 'Academia Desconhecida'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(checkin.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            ✅ Confirmado
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentCheckins.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum check-in recente encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/admin/users" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl">👥</div>
                        <div>
                            <h3 className="font-bold text-gray-900">Gerenciar Usuários</h3>
                            <p className="text-sm text-gray-500">Roles e permissões</p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/finance" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl">💰</div>
                        <div>
                            <h3 className="font-bold text-gray-900">Financeiro</h3>
                            <p className="text-sm text-gray-500">Receitas e repasses</p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/logs" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl">📋</div>
                        <div>
                            <h3 className="font-bold text-gray-900">Logs de Auditoria</h3>
                            <p className="text-sm text-gray-500">Histórico de ações</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
