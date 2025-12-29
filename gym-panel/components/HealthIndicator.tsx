import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthIndicatorProps {
    trend: 'up' | 'down' | 'stable';
    avgLast7: number;
    avgLast30: number;
}

export default function HealthIndicator({ trend, avgLast7, avgLast30 }: HealthIndicatorProps) {
    const config = {
        up: {
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            label: 'Engajamento em alta',
            description: 'A média de check-ins está acima da média mensal'
        },
        down: {
            icon: TrendingDown,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            label: 'Engajamento em queda',
            description: 'A média de check-ins está abaixo da média mensal'
        },
        stable: {
            icon: Minus,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            label: 'Engajamento estável',
            description: 'A média de check-ins está dentro do esperado'
        }
    };

    const { icon: Icon, color, bgColor, borderColor, label, description } = config[trend];

    const percentChange = avgLast30 > 0
        ? ((avgLast7 - avgLast30) / avgLast30 * 100).toFixed(1)
        : 0;

    return (
        <div className={`${bgColor} ${borderColor} border rounded-xl p-4`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${bgColor} border ${borderColor}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1">
                    <h3 className={`font-bold text-sm ${color}`}>{label}</h3>
                    <p className="text-xs text-gray-600 mt-1">{description}</p>
                    <div className="mt-2 flex gap-4 text-xs">
                        <div>
                            <span className="text-gray-500">Últimos 7 dias:</span>
                            <span className="font-bold ml-1">{avgLast7.toFixed(1)}/dia</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Últimos 30 dias:</span>
                            <span className="font-bold ml-1">{avgLast30.toFixed(1)}/dia</span>
                        </div>
                        {percentChange !== 0 && (
                            <div className={`font-bold ${Number(percentChange) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Number(percentChange) > 0 ? '+' : ''}{percentChange}%
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
