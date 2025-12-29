'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Users, Building2, CreditCard, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

interface Metrics {
    total_users: number;
    new_users_30d: number;
    blocked_users: number;
    total_academies: number;
    active_academies: number;
    suspended_academies: number;
    active_memberships: number;
    solo_plans: number;
    family_plans: number;
    checkins_30d: number;
    validated_checkins_total: number;
    published_reviews: number;
    pending_reviews: number;
    active_ads: number;
    total_payouts_cents: number;
}

export default function AdminOverviewPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const { data } = await supabase.from('view_platform_metrics').select('*').single();
            setMetrics(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!metrics) {
        return <div className="p-8 text-center text-gray-500">Erro ao carregar métricas</div>;
    }

    const mrr = (metrics.active_memberships * 99) / 100; // Assumindo R$ 99/mês médio
    const platformMargin = metrics.total_payouts_cents > 0
        ? ((mrr * 100 - metrics.total_payouts_cents / 100) / (mrr * 100)) * 100
        : 0;

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Ops Cockpit</h1>
                <p className="text-gray-600">Visão global da plataforma em tempo real</p>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Users */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-8 h-8 text-blue-600" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Usuários</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{metrics.total_users.toLocaleString()}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-green-600 font-medium">+{metrics.new_users_30d}</span>
                        <span className="text-gray-500">últimos 30 dias</span>
                    </div>
                    {metrics.blocked_users > 0 && (
                        <div className="mt-2 text-xs text-red-600">⚠️ {metrics.blocked_users} bloqueados</div>
                    )}
                </div>

                {/* Academies */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Building2 className="w-8 h-8 text-purple-600" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Academias</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{metrics.total_academies}</div>
                    <div className="mt-2 text-sm text-gray-600">{metrics.active_academies} ativas</div>
                    {metrics.suspended_academies > 0 && (
                        <div className="mt-2 text-xs text-orange-600">⏸️ {metrics.suspended_academies} suspensas</div>
                    )}
                </div>

                {/* Revenue (MRR) */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <CreditCard className="w-8 h-8 text-green-600" />
                        <span className="text-xs font-medium text-gray-500 uppercase">MRR</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="mt-2 text-sm text-gray-600">{metrics.active_memberships} assinaturas ativas</div>
                    <div className="mt-1 text-xs text-gray-500">
                        {metrics.solo_plans} Solo | {metrics.family_plans} Família
                    </div>
                </div>

                {/* Checkins */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Activity className="w-8 h-8 text-orange-600" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Check-ins</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{metrics.checkins_30d.toLocaleString()}</div>
                    <div className="mt-2 text-sm text-gray-600">últimos 30 dias</div>
                    <div className="mt-1 text-xs text-gray-500">{metrics.validated_checkins_total.toLocaleString()} validados (total)</div>
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Reviews */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">⭐ Reviews</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Publicadas</span>
                            <span className="font-bold">{metrics.published_reviews}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Pendentes</span>
                            <span className="font-bold text-orange-600">{metrics.pending_reviews}</span>
                        </div>
                    </div>
                </div>

                {/* Ads */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">📢 Campanhas Ativas</h3>
                    <div className="text-4xl font-bold text-purple-600">{metrics.active_ads}</div>
                    <div className="mt-2 text-sm text-gray-600">Anúncios rodando</div>
                </div>

                {/* Platform Margin */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">💰 Margem Plataforma</h3>
                    <div className="text-4xl font-bold text-green-600">{platformMargin.toFixed(1)}%</div>
                    <div className="mt-2 text-sm text-gray-600">
                        Payouts: R$ {(metrics.total_payouts_cents / 100).toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">🚀 Ações Rápidas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <a href="/admin/users" className="flex items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                        <Users size={20} className="text-blue-600" />
                        <span className="font-medium text-blue-900">Gerenciar Usuários</span>
                    </a>
                    <a href="/admin/academies" className="flex items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                        <Building2 size={20} className="text-purple-600" />
                        <span className="font-medium text-purple-900">Gerenciar Academias</span>
                    </a>
                    <a href="/admin/payouts" className="flex items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                        <CreditCard size={20} className="text-green-600" />
                        <span className="font-medium text-green-900">Processar Payouts</span>
                    </a>
                    <a href="/admin/fraud" className="flex items-center gap-2 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <AlertTriangle size={20} className="text-red-600" />
                        <span className="font-medium text-red-900">Anti-Fraude</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
