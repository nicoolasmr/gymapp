'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PartnerPlans() {
    const [academy, setAcademy] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [academyData, plansData] = await Promise.all([
                supabase.rpc('get_my_academy').maybeSingle(),
                supabase.from('modality_plans').select('*').eq('is_active', true)
            ]);

            setAcademy(academyData.data);
            setPlans(plansData.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    const myModalityPlans = plans.filter(p => p.modality_type === academy?.modality);

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Planos Aceitos</h1>
                <p className="text-gray-600 mt-2">
                    Veja quais planos sua academia aceita e como funciona o repasse
                </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-blue-900 mb-2">💡 Como Funciona o Repasse</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Você recebe um valor <strong>por check-in</strong> realizado na sua academia</li>
                    <li>• O valor varia de acordo com o plano do aluno (Solo ou Família)</li>
                    <li>• Há um limite mínimo e máximo de check-ins por semana</li>
                    <li>• Os repasses são calculados automaticamente e pagos mensalmente</li>
                </ul>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myModalityPlans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                            <h3 className="text-2xl font-bold">{plan.plan_name}</h3>
                            <p className="text-blue-100 mt-1 capitalize">{plan.plan_type}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Repasse por Check-in</p>
                                <p className="text-3xl font-bold text-green-600">
                                    R$ {(plan.repasse_per_checkin || 0).toFixed(2)}
                                </p>
                            </div>

                            <div className="border-t border-gray-100 pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Preço Mensal (Aluno):</span>
                                    <span className="font-bold text-gray-900">R$ {(plan.monthly_price || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Check-ins/dia:</span>
                                    <span className="font-bold text-gray-900">{plan.max_checkins_per_day}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Check-ins/semana:</span>
                                    <span className="font-bold text-gray-900">{plan.max_checkins_per_week}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mt-4">
                                <p className="text-xs text-gray-600">
                                    <strong>Repasse Mínimo:</strong> R$ {(plan.repasse_min || 0).toFixed(2)} |
                                    <strong> Máximo:</strong> R$ {(plan.repasse_max || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {myModalityPlans.length === 0 && (
                <div className="bg-gray-50 rounded-xl p-12 text-center">
                    <p className="text-gray-500">Nenhum plano disponível para sua modalidade no momento.</p>
                </div>
            )}

            {/* Custom Repasse Info */}
            {academy?.custom_repasse_value && (
                <div className="mt-8 bg-orange-50 border border-orange-100 rounded-xl p-6">
                    <h3 className="font-bold text-orange-900 mb-2">⚠️ Repasse Customizado Ativo</h3>
                    <p className="text-sm text-orange-800">
                        Sua academia possui um <strong>repasse negociado especial</strong> de <strong>R$ {(academy.custom_repasse_value || 0).toFixed(2)}</strong> por check-in,
                        que sobrescreve os valores padrão acima.
                    </p>
                </div>
            )}
        </div>
    );
}
