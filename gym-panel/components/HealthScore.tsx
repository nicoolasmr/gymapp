import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface HealthScoreData {
    score: number;
    status: 'excellent' | 'good' | 'average' | 'at_risk' | 'critical';
    breakdown: {
        engagement: number;
        profile: number;
        pricing: number;
    };
    metrics: {
        total_checkins_30d: number;
        avg_checkins_per_week: number;
        unique_users_30d: number;
        modalities_count: number;
        profile_completeness: number;
    };
}

interface HealthScoreProps {
    data: HealthScoreData | null;
    loading?: boolean;
}

export default function HealthScore({ data, loading = false }: HealthScoreProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-500 text-center">Dados não disponíveis</p>
            </div>
        );
    }

    const getStatusConfig = () => {
        switch (data.status) {
            case 'excellent':
                return {
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    icon: CheckCircle,
                    label: 'Excelente',
                    description: 'Sua academia está com ótima performance!'
                };
            case 'good':
                return {
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    icon: TrendingUp,
                    label: 'Bom',
                    description: 'Boa performance, continue assim!'
                };
            case 'average':
                return {
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    icon: AlertCircle,
                    label: 'Médio',
                    description: 'Há espaço para melhorias'
                };
            case 'at_risk':
                return {
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50',
                    borderColor: 'border-orange-200',
                    icon: TrendingDown,
                    label: 'Em Risco',
                    description: 'Atenção necessária!'
                };
            case 'critical':
                return {
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    icon: AlertCircle,
                    label: 'Crítico',
                    description: 'Ação imediata necessária!'
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className={`bg-white rounded-xl border-2 ${config.borderColor} p-6`}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Health Score</h3>
                    <p className="text-sm text-gray-600">{config.description}</p>
                </div>
                <div className={`p-3 rounded-full ${config.bgColor}`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
            </div>

            {/* Score Circle */}
            <div className="flex items-center justify-center mb-6">
                <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="#E5E7EB"
                            strokeWidth="8"
                            fill="none"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${(data.score / 100) * 351.86} 351.86`}
                            className={`transition-all duration-1000 ${config.color}`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className={`text-3xl font-bold ${config.color}`}>{data.score}</span>
                        <span className="text-xs text-gray-500">de 100</span>
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 mb-6 text-center`}>
                <span className={`font-bold ${config.color}`}>{config.label}</span>
            </div>

            {/* Breakdown */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento</h4>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Engajamento</span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${(data.breakdown.engagement / 40) * 100}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                            {data.breakdown.engagement}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Perfil</span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-600 rounded-full transition-all duration-500"
                                style={{ width: `${(data.breakdown.profile / 30) * 100}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                            {data.breakdown.profile}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Preços</span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                style={{ width: `${(data.breakdown.pricing / 30) * 100}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                            {data.breakdown.pricing}
                        </span>
                    </div>
                </div>
            </div>

            {/* Metrics Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{data.metrics.total_checkins_30d}</div>
                        <div className="text-xs text-gray-500">Check-ins (30d)</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{data.metrics.unique_users_30d}</div>
                        <div className="text-xs text-gray-500">Usuários Únicos</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
