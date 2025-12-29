'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Globe, TrendingUp, Users, Building2, DollarSign, MapPin } from 'lucide-react';

interface CountryStats {
    country_code: string;
    country_name: string;
    flag_emoji: string;
    total_academies: number;
    total_users: number;
    total_checkins_today: number;
    total_checkins_week: number;
    revenue_month_cents: number;
    currency: string;
}

export default function WorldDashboardPage() {
    const [stats, setStats] = useState<CountryStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchGlobalStats();
    }, []);

    const fetchGlobalStats = async () => {
        try {
            const { data, error } = await supabase.rpc('get_global_stats_by_country');

            if (error) throw error;
            setStats(data || []);
        } catch (error) {
            console.error('Error fetching global stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTotalStats = () => {
        return {
            academies: stats.reduce((sum, s) => sum + Number(s.total_academies), 0),
            users: stats.reduce((sum, s) => sum + Number(s.total_users), 0),
            checkinsToday: stats.reduce((sum, s) => sum + Number(s.total_checkins_today), 0),
            checkinsWeek: stats.reduce((sum, s) => sum + Number(s.total_checkins_week), 0),
        };
    };

    const formatRevenue = (cents: number, currency: string) => {
        const symbols: { [key: string]: string } = {
            'BRL': 'R$',
            'USD': '$',
            'EUR': '€',
            'MXN': '$',
            'GBP': '£',
            'CAD': '$'
        };
        return `${symbols[currency] || '$'} ${(cents / 100).toFixed(2)}`;
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const totals = getTotalStats();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Globe className="w-8 h-8 text-blue-600" />
                    Painel Mundial
                </h1>
                <p className="text-gray-600">Visão global da plataforma por país</p>
            </div>

            {/* Global Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <Building2 className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">Total</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{totals.academies}</div>
                    <div className="text-sm opacity-90">Academias Globais</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">Total</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{totals.users}</div>
                    <div className="text-sm opacity-90">Usuários Globais</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">Hoje</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{totals.checkinsToday}</div>
                    <div className="text-sm opacity-90">Check-ins Globais</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <DollarSign className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">7 dias</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{totals.checkinsWeek}</div>
                    <div className="text-sm opacity-90">Check-ins Semanais</div>
                </div>
            </div>

            {/* Countries Grid */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Estatísticas por País</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((country) => (
                        <div
                            key={country.country_code}
                            className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${selectedCountry === country.country_code
                                    ? 'border-blue-500 shadow-lg'
                                    : 'border-gray-200'
                                }`}
                            onClick={() => setSelectedCountry(country.country_code)}
                        >
                            {/* Country Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{country.flag_emoji}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{country.country_name}</h3>
                                        <p className="text-sm text-gray-500">{country.country_code}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Building2 className="w-4 h-4" />
                                        <span className="text-sm">Academias</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{country.total_academies}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Users className="w-4 h-4" />
                                        <span className="text-sm">Usuários</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{country.total_users}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-sm">Check-ins Hoje</span>
                                    </div>
                                    <span className="font-bold text-green-600">{country.total_checkins_today}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-sm">Check-ins (7d)</span>
                                    </div>
                                    <span className="font-bold text-blue-600">{country.total_checkins_week}</span>
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <DollarSign className="w-4 h-4" />
                                            <span className="text-sm">Receita (30d)</span>
                                        </div>
                                        <span className="font-bold text-purple-600">
                                            {formatRevenue(Number(country.revenue_month_cents), country.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* World Map Placeholder */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-blue-600" />
                    Mapa Mundial
                </h2>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-12 text-center border-2 border-dashed border-blue-200">
                    <Globe className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Heatmap Mundial</p>
                    <p className="text-sm text-gray-500">
                        Integração com Mapbox ou Leaflet para visualização geográfica
                    </p>
                </div>
            </div>

            {/* Growth Trends */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Crescimento Semanal</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.slice(0, 3).map((country) => {
                        const growth = country.total_checkins_week > 0
                            ? ((Number(country.total_checkins_today) / Number(country.total_checkins_week)) * 7 * 100).toFixed(1)
                            : 0;

                        return (
                            <div key={country.country_code} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">{country.flag_emoji}</span>
                                    <span className="font-medium text-gray-900">{country.country_name}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-green-600">+{growth}%</span>
                                    <span className="text-sm text-gray-500">vs. média semanal</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-2">🌍 Expansão Global</h3>
                <p className="text-blue-800 mb-4">
                    A plataforma está presente em {stats.length} países, com {totals.academies} academias
                    e {totals.users} usuários ativos globalmente.
                </p>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Adicionar Novo País
                    </button>
                    <button className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        Exportar Relatório
                    </button>
                </div>
            </div>
        </div>
    );
}
