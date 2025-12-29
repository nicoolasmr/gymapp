import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';
export type InsightType = 'positive' | 'negative' | 'warning' | 'neutral';

interface InsightCardProps {
    type: InsightType;
    severity?: InsightSeverity;
    title: string;
    description: string;
    suggestion?: string;
    isCritical?: boolean;
}

export default function InsightCard({
    type,
    severity = 'low',
    title,
    description,
    suggestion,
    isCritical = false
}: InsightCardProps) {
    const config = {
        positive: {
            icon: TrendingUp,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600',
            iconBg: 'bg-green-100',
            titleColor: 'text-green-900',
            descColor: 'text-green-700'
        },
        negative: {
            icon: TrendingDown,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-600',
            iconBg: 'bg-red-100',
            titleColor: 'text-red-900',
            descColor: 'text-red-700'
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            iconColor: 'text-yellow-600',
            iconBg: 'bg-yellow-100',
            titleColor: 'text-yellow-900',
            descColor: 'text-yellow-700'
        },
        neutral: {
            icon: CheckCircle,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            iconColor: 'text-blue-600',
            iconBg: 'bg-blue-100',
            titleColor: 'text-blue-900',
            descColor: 'text-blue-700'
        }
    };

    // Override colors based on severity
    const severityConfig = {
        critical: {
            icon: AlertTriangle,
            bgColor: 'bg-red-100',
            borderColor: 'border-red-400',
            iconColor: 'text-red-700',
            iconBg: 'bg-red-200',
            titleColor: 'text-red-950',
            descColor: 'text-red-800'
        },
        high: {
            icon: AlertTriangle,
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-300',
            iconColor: 'text-orange-600',
            iconBg: 'bg-orange-100',
            titleColor: 'text-orange-900',
            descColor: 'text-orange-700'
        }
    };

    const finalConfig = severity === 'critical' || severity === 'high'
        ? severityConfig[severity]
        : config[type];

    const { icon: Icon, bgColor, borderColor, iconColor, iconBg, titleColor, descColor } = finalConfig;

    return (
        <div className={`${bgColor} border-2 ${borderColor} rounded-xl p-5 relative ${isCritical ? 'shadow-lg' : 'shadow-sm'}`}>
            {isCritical && (
                <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg">
                    <Zap className="w-4 h-4" fill="currentColor" />
                </div>
            )}

            <div className="flex items-start gap-4">
                <div className={`${iconBg} p-3 rounded-lg flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>

                <div className="flex-1">
                    <h3 className={`font-bold text-base ${titleColor} mb-2`}>
                        {title}
                    </h3>
                    <p className={`text-sm ${descColor} leading-relaxed mb-3`}>
                        {description}
                    </p>

                    {suggestion && (
                        <div className={`${iconBg} rounded-lg p-3 mt-3`}>
                            <p className={`text-xs font-medium ${titleColor} mb-1`}>💡 Sugestão:</p>
                            <p className={`text-sm ${descColor}`}>{suggestion}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
