'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Zap, MapPin, Globe, Dumbbell, Calendar, DollarSign } from 'lucide-react';

interface Boost {
    id: string;
    boost_type: string;
    price_cents: number;
    status: string;
    start_date: string;
    end_date: string;
    target_location?: string;
    target_modality?: string;
}

const BOOST_TYPES = [
    {
        type: 'local',
        name: 'Boost Local',
        description: 'Destaque na sua cidade',
        price: 4900,
        icon: MapPin,
        color: 'blue'
    },
    {
        type: 'regional',
        name: 'Boost Regional',
        description: 'Destaque no estado inteiro',
        price: 9900,
        icon: Globe,
        color: 'purple'
    },
    {
        type: 'national',
        name: 'Boost Nacional',
        description: 'Destaque em todo o Brasil',
        price: 24900,
        icon: Zap,
        color: 'yellow'
    },
    {
        type: 'modality',
        name: 'Boost por Modalidade',
        description: 'Destaque para modalidade específica',
        price: 3900,
        icon: Dumbbell,
        color: 'green'
    }
];

export default function BoostsPage() {
    const [activeBoosts, setActiveBoosts] = useState<Boost[]>([]);
    const [loading, setLoading] = useState(true);
    const [academyId, setAcademyId] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchBoosts();
    }, []);

    const fetchBoosts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: academy } = await supabase.rpc('get_my_academy').maybeSingle();
            if (!academy) return;

            setAcademyId((academy as any).id);

            const { data: boosts } = await supabase
                .from('academy_boosts')
                .select('*')
                .eq('academy_id', (academy as any).id)
                .eq('status', 'active')
                .gte('end_date', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (boosts) {
                setActiveBoosts(boosts);
            }
        } catch (error) {
            console.error('Error fetching boosts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchaseBoost = async (boostType: string, price: number) => {
        if (!academyId) {
            alert('Academia não encontrada');
            return;
        }

        // Aqui você integraria com Stripe
        // Por enquanto, vamos criar o boost diretamente
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7); // 7 dias

        const { error } = await supabase
            .from('academy_boosts')
            .insert({
                academy_id: academyId,
                boost_type: boostType,
                price_cents: price,
                status: 'active',
                end_date: endDate.toISOString()
            });

        if (error) {
            console.error('Error creating boost:', error);
            alert('Erro ao criar boost: ' + error.message);
        } else {
            alert('Boost ativado com sucesso!');
            fetchBoosts();
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Boosts & Destaques</h1>
                <p className="text-gray-600">Aumente a visibilidade da sua academia no app</p>
            </div>

            {/* Active Boosts */}
            {activeBoosts.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-600" />
                        Boosts Ativos
                    </h2>
                    <div className="space-y-3">
                        {activeBoosts.map((boost) => {
                            const boostConfig = BOOST_TYPES.find(b => b.type === boost.boost_type);
                            return (
                                <div key={boost.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {boostConfig && <boostConfig.icon className="w-5 h-5 text-gray-600" />}
                                        <div>
                                            <div className="font-medium text-gray-900">{boostConfig?.name}</div>
                                            <div className="text-sm text-gray-500">
                                                Expira em {new Date(boost.end_date).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-green-600">Ativo</div>
                                        <div className="text-xs text-gray-500">R$ {(boost.price_cents / 100).toFixed(2)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Available Boosts */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Planos Disponíveis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {BOOST_TYPES.map((boost) => {
                        const Icon = boost.icon;
                        const isActive = activeBoosts.some(b => b.boost_type === boost.type);

                        return (
                            <div
                                key={boost.type}
                                className={`bg-white rounded-xl border-2 p-6 transition-all ${isActive
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                                    }`}
                            >
                                <div className={`p-3 rounded-lg inline-block mb-4 ${boost.color === 'blue' ? 'bg-blue-100' :
                                    boost.color === 'purple' ? 'bg-purple-100' :
                                        boost.color === 'yellow' ? 'bg-yellow-100' :
                                            'bg-green-100'
                                    }`}>
                                    <Icon className={`w-6 h-6 ${boost.color === 'blue' ? 'text-blue-600' :
                                        boost.color === 'purple' ? 'text-purple-600' :
                                            boost.color === 'yellow' ? 'text-yellow-600' :
                                                'text-green-600'
                                        }`} />
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-2">{boost.name}</h3>
                                <p className="text-sm text-gray-600 mb-4">{boost.description}</p>

                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-gray-900">
                                        R$ {(boost.price / 100).toFixed(2)}
                                    </div>
                                    <div className="text-sm text-gray-500">por semana</div>
                                </div>

                                <button
                                    onClick={() => handlePurchaseBoost(boost.type, boost.price)}
                                    disabled={isActive}
                                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${isActive
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isActive ? 'Boost Ativo' : 'Ativar Boost'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Benefits */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-4">✨ Benefícios dos Boosts</h3>
                <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">✓</span>
                        <span>Apareça no topo da lista de academias</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">✓</span>
                        <span>Badge &quot;Academia Destaque&quot; no seu perfil</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">✓</span>
                        <span>Maior visibilidade para novos usuários</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">✓</span>
                        <span>Aumento médio de 3x em novos check-ins</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
