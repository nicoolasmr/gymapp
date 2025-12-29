'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { TrendingUp, Users, DollarSign, Target, Activity } from 'lucide-react';

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState({
        dau: 0,
        wau: 0,
        mau: 0,
        retention_d1: 0,
        retention_d7: 0,
        retention_d30: 0,
    });
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const [dau, wau, mau, ret1, ret7, ret30] = await Promise.all([
                supabase.rpc('get_dau'),
                supabase.rpc('get_wau'),
                supabase.rpc('get_mau'),
                supabase.rpc('calculate_retention', { p_days: 1 }),
                supabase.rpc('calculate_retention', { p_days: 7 }),
                supabase.rpc('calculate_retention', { p_days: 30 }),
            ]);

            setMetrics({
                dau: dau.data || 0,
                wau: wau.data || 0,
                mau: mau.data || 0,
                retention_d1: ret1.data || 0,
                retention_d7: ret7.data || 0,
                retention_d30: ret30.data || 0,
            });
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setLoading(false);
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-600" />
                    Analytics 2.0
                </h1>
                <p className="text-gray-600">Métricas avançadas de engajamento e monetização</p>
            </div>

            {/* Active Users */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">DAU</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{metrics.dau}</div>
                    <div className="text-sm opacity-90">Daily Active Users</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">WAU</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{metrics.wau}</div>
                    <div className="text-sm opacity-90">Weekly Active Users</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">MAU</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{metrics.mau}</div>
                    <div className="text-sm opacity-90">Monthly Active Users</div>
                </div>
            </div>

            {/* Retention */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    Retenção de Usuários
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <div className="text-4xl font-bold text-blue-600 mb-2">{metrics.retention_d1}%</div>
                        <div className="text-sm text-gray-600">Retenção D1</div>
                        <div className="text-xs text-gray-500 mt-1">Dia 1</div>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <div className="text-4xl font-bold text-green-600 mb-2">{metrics.retention_d7}%</div>
                        <div className="text-sm text-gray-600">Retenção D7</div>
                        <div className="text-xs text-gray-500 mt-1">Dia 7</div>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <div className="text-4xl font-bold text-purple-600 mb-2">{metrics.retention_d30}%</div>
                        <div className="text-sm text-gray-600">Retenção D30</div>
                        <div className="text-xs text-gray-500 mt-1">Dia 30</div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-2">📊 Analytics Avançado</h3>
                <p className="text-blue-800 text-sm">
                    Acompanhe métricas de engajamento em tempo real. DAU, WAU, MAU e retenção são calculados automaticamente.
                </p>
            </div>
        </div>
    );
}
