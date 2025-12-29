import React from 'react';
import InsightCard, { InsightSeverity, InsightType } from './InsightCard';
import { Lightbulb, Clock, Dumbbell, TrendingUp, Target } from 'lucide-react';

interface AcademyInsights {
    engagement: {
        status: 'rising' | 'falling' | 'stable';
        percent_change: number;
        message: string;
        severity: InsightSeverity;
    };
    peak_hours: {
        busiest_hour: string;
        slowest_hour: string;
        message: string;
    };
    modalities: {
        most_popular: string;
        least_popular: string;
        message: string;
    };
    predictions: {
        tomorrow_estimated_checkins: number;
        message: string;
    };
    suggestions: string[];
}

interface InsightsPanelProps {
    insights: AcademyInsights | null;
    loading?: boolean;
}

export default function InsightsPanel({ insights, loading = false }: InsightsPanelProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200 p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Insights em breve</h3>
                <p className="text-gray-600 text-sm">
                    Precisamos de mais dados para gerar insights inteligentes. Continue registrando check-ins!
                </p>
            </div>
        );
    }

    // Determinar tipo do insight de engajamento
    const getEngagementType = (): InsightType => {
        if (insights.engagement.status === 'rising') return 'positive';
        if (insights.engagement.status === 'falling') return 'negative';
        return 'neutral';
    };

    // Ordenar insights por severidade (critical primeiro)
    const criticalInsights = [];
    const normalInsights = [];

    const engagementInsight = (
        <InsightCard
            key="engagement"
            type={getEngagementType()}
            severity={insights.engagement.severity}
            title={
                insights.engagement.status === 'rising' ? '📈 Engajamento em alta' :
                    insights.engagement.status === 'falling' ? '📉 Engajamento em queda' :
                        '➡️ Engajamento estável'
            }
            description={insights.engagement.message}
            suggestion={insights.suggestions[0]}
            isCritical={insights.engagement.severity === 'critical'}
        />
    );

    if (insights.engagement.severity === 'critical' || insights.engagement.severity === 'high') {
        criticalInsights.push(engagementInsight);
    } else {
        normalInsights.push(engagementInsight);
    }

    // Horários de pico
    normalInsights.push(
        <InsightCard
            key="peak_hours"
            type="neutral"
            title="🕐 Análise de Horários"
            description={insights.peak_hours.message}
            suggestion={insights.suggestions[1]}
        />
    );

    // Modalidades
    normalInsights.push(
        <InsightCard
            key="modalities"
            type="warning"
            title="🏋️ Modalidades"
            description={insights.modalities.message}
            suggestion={insights.suggestions[2]}
        />
    );

    // Previsão
    normalInsights.push(
        <InsightCard
            key="predictions"
            type="positive"
            title="🔮 Previsão para Amanhã"
            description={insights.predictions.message}
            suggestion={insights.suggestions[3]}
        />
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                    <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Insights Inteligentes</h2>
                    <p className="text-sm text-gray-500">Análises automáticas e recomendações personalizadas</p>
                </div>
            </div>

            {/* Critical insights first */}
            {criticalInsights.length > 0 && (
                <div className="space-y-4 mb-6">
                    {criticalInsights}
                </div>
            )}

            {/* Normal insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {normalInsights}
            </div>
        </div>
    );
}
