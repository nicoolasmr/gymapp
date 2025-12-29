'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function UserDetails({ params }: { params: { id: string } }) {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [granting, setGranting] = useState(false);

    const [user, setUser] = useState<any>(null);
    const [membership, setMembership] = useState<any>(null);
    const [checkins, setCheckins] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // 1. Dados do Usuário
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', params.id)
                .single();

            if (userError) throw userError;
            setUser(userData);

            // 2. Assinatura Ativa
            const { data: memData } = await supabase
                .from('memberships')
                .select('*, modality_plans(*)')
                .eq('user_id', params.id)
                .eq('status', 'active')
                .single();
            setMembership(memData);

            // 3. Últimos Check-ins
            const { data: checkData } = await supabase
                .from('checkins')
                .select('*, academies(name)')
                .eq('user_id', params.id)
                .order('created_at', { ascending: false })
                .limit(10);
            setCheckins(checkData || []);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados do usuário');
        } finally {
            setLoading(false);
        }
    };

    const handleGrantSubscription = async (planId: number, days: number) => {
        if (!confirm(`Tem certeza que deseja conceder ${days} dias de acesso grátis?`)) return;

        setGranting(true);
        try {
            const { error } = await supabase.rpc('grant_manual_subscription', {
                p_user_id: params.id,
                p_plan_id: planId,
                p_days_duration: days
            });

            if (error) throw error;

            alert('Assinatura concedida com sucesso!');
            fetchData(); // Recarregar dados
        } catch (error) {
            console.error('Erro ao conceder assinatura:', error);
            alert('Erro ao processar pedido');
        } finally {
            setGranting(false);
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;
    if (!user) return <div className="p-8">Usuário não encontrado</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Detalhes do Aluno</h1>
                <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">Voltar</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Coluna Esquerda: Perfil e Ações */}
                <div className="space-y-6">
                    {/* Card Perfil */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                                {user.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">ID:</span>
                                <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Role:</span>
                                <span className="font-medium capitalize">{user.role}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Convite:</span>
                                <span className="font-mono">{user.referral_code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card Assinatura */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4">Assinatura Atual</h3>
                        {membership ? (
                            <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-green-800">
                                        {membership.modality_plans?.plan_name}
                                    </span>
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-bold">ATIVO</span>
                                </div>
                                <p className="text-sm text-green-700 mb-1">
                                    Expira em: {new Date(membership.renewal_date).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-green-600">
                                    Via: {membership.payment_provider === 'manual' ? 'Manual (Admin)' : 'Stripe'}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-gray-500 text-sm">Nenhuma assinatura ativa</p>
                            </div>
                        )}
                    </div>

                    {/* Ações Manuais */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4">Ações Administrativas</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => handleGrantSubscription(1, 30)}
                                disabled={granting}
                                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Conceder Plano Solo (30 dias)
                            </button>
                            <button
                                onClick={() => handleGrantSubscription(2, 30)}
                                disabled={granting}
                                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                Conceder Plano Família (30 dias)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Histórico */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4">Últimos Check-ins</h3>
                        <div className="overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-700">Data</th>
                                        <th className="px-4 py-3 font-medium text-gray-700">Academia</th>
                                        <th className="px-4 py-3 font-medium text-gray-700">Valor Repasse</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {checkins.map((checkin) => (
                                        <tr key={checkin.id}>
                                            <td className="px-4 py-3 text-gray-600">
                                                {new Date(checkin.created_at).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {checkin.academies?.name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                R$ {checkin.repasse_value?.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {checkins.length === 0 && (
                                <p className="text-center text-gray-500 py-8">Nenhum treino registrado.</p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
