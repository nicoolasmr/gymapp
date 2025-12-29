'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Building2, Users, Activity, TrendingUp, AlertCircle, Award, CheckCircle } from 'lucide-react';
import HealthScore from '@/components/HealthScore';

interface GlobalStats {
    total_academies: number;
    total_active_users: number;
    checkins_today: number;
    checkins_last_7_days: number;
    avg_health_score: number;
}

interface AcademyRanking {
    id: string;
    name: string;
    score: number;
    status: string;
    total_checkins: number;
}

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [topAcademies, setTopAcademies] = useState<AcademyRanking[]>([]);
    const [atRiskAcademies, setAtRiskAcademies] = useState<AcademyRanking[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchGlobalData();
    }, []);

    const fetchGlobalData = async () => {
        try {
            // Fetch global stats
            const { data: statsData } = await supabase
                .rpc('get_global_stats')
                .single();

            if (statsData) {
                setStats(statsData);
            }

            // Fetch academies for ranking
            const { data: academies } = await supabase
                .from('academies')
                .select('id, name')
                .limit(20);

            if (academies) {
                // Calculate health score for each academy
                const academiesWithScores = await Promise.all(
                    academies.map(async (academy) => {
                        const { data: scoreData } = await supabase
                            .rpc('calculate_academy_health_score', { p_academy_id: academy.id })
                            .single();

                        const { data: checkins } = await supabase
                            .from('checkins')
                            .select('id')
                            .eq('academy_id', academy.id)
                            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

                        return {
                            id: academy.id,
                            name: academy.name,
                            score: scoreData?.score || 0,
                            status: scoreData?.status || 'unknown',
                            total_checkins: checkins?.length || 0
                        };
                    })
                );

                // Sort by score
                const sorted = academiesWithScores.sort((a, b) => b.score - a.score);
                setTopAcademies(sorted.slice(0, 10));
                setAtRiskAcademies(sorted.filter(a => a.score < 40).slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching global data:', error);
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

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Visão Geral Global</h1>
                <p className="text-gray-600">Dashboard administrativo da plataforma</p>
            </div>

            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.total_academies || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total de Academias</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.total_active_users || 0}
                    </div>
                    <div className="text-sm text-gray-600">Usuários Ativos</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Activity className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.checkins_today || 0}
                    </div>
                    <div className="text-sm text-gray-600">Check-ins Hoje</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.checkins_last_7_days || 0}
                    </div>
                    <div className="text-sm text-gray-600">Check-ins (7 dias)</div>
                </div>
            </div>

            {/* Health Score Average */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-white rounded-full shadow-sm">
                        <Award className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Health Score Médio da Plataforma</h3>
                        <p className="text-gray-600">Baseado em todas as academias ativas</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold text-blue-600">{stats?.avg_health_score || 0}</div>
                        <div className="text-sm text-gray-600">de 100</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Academies */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-600" />
                        Top 10 Academias
                    </h3>
                    <div className="space-y-3">
                        {topAcademies.map((academy, index) => (
                            <div key={academy.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-50 text-blue-700'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{academy.name}</div>
                                    <div className="text-xs text-gray-500">{academy.total_checkins} check-ins</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-gray-900">{academy.score}</div>
                                    <div className="text-xs text-gray-500">score</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* At Risk Academies */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        Academias em Risco
                    </h3>
                    {atRiskAcademies.length > 0 ? (
                        <div className="space-y-3">
                            {atRiskAcademies.map((academy) => (
                                <div key={academy.id} className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{academy.name}</div>
                                        <div className="text-xs text-gray-500">{academy.total_checkins} check-ins</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-red-600">{academy.score}</div>
                                        <div className="text-xs text-red-500">crítico</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                            <p>Nenhuma academia em risco!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* System Alerts */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Alertas do Sistema</h3>
                <div className="space-y-3">
                    {atRiskAcademies.length > 0 && (
                        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-medium text-orange-900">
                                    {atRiskAcademies.length} academia(s) com baixo health score
                                </div>
                                <div className="text-sm text-orange-700 mt-1">
                                    Recomenda-se entrar em contato para oferecer suporte
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="font-medium text-blue-900">
                                Sistema operando normalmente
                            </div>
                            <div className="text-sm text-blue-700 mt-1">
                                Todas as métricas dentro do esperado
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
