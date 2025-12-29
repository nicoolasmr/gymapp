'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AdminPlans() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('modality_plans')
                .select('*')
                .order('modality_type');

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Erro ao buscar planos:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Planos e Preços</h1>
                    <p className="text-gray-600 mt-2">Configuração de planos e regras de repasse</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Modalidade</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Tipo</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Preço Mensal</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Repasse (Check-in)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Limites</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {plans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium capitalize">
                                    {plan.modality_type === 'gym_standard' ? 'Academia' :
                                        plan.modality_type === 'crossfit_box' ? 'CrossFit' : plan.modality_type}
                                </td>
                                <td className="px-6 py-4 capitalize">
                                    {plan.plan_type}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">
                                    R$ {plan.monthly_price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-orange-600 font-medium">
                                    R$ {plan.repasse_per_checkin.toFixed(2)}
                                    <span className="text-xs text-gray-500 block">
                                        (Min: {plan.repasse_min} / Max: {plan.repasse_max})
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div>{plan.max_checkins_per_day} check-in/dia</div>
                                    <div>{plan.max_checkins_per_week} check-ins/semana</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {plan.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
