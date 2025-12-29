import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

interface AlertCardProps {
    type: 'warning' | 'danger' | 'success';
    title: string;
    description: string;
}

export default function AlertCard({ type, title, description }: AlertCardProps) {
    const config = {
        warning: {
            icon: AlertCircle,
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            iconColor: 'text-yellow-600',
            titleColor: 'text-yellow-900',
            descColor: 'text-yellow-700'
        },
        danger: {
            icon: AlertTriangle,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-600',
            titleColor: 'text-red-900',
            descColor: 'text-red-700'
        },
        success: {
            icon: CheckCircle,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600',
            titleColor: 'text-green-900',
            descColor: 'text-green-700'
        }
    };

    const { icon: Icon, bgColor, borderColor, iconColor, titleColor, descColor } = config[type];

    return (
        <div className={`${bgColor} border ${borderColor} rounded-xl p-4 flex items-start gap-3`}>
            <div className={`${iconColor} mt-0.5`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h3 className={`font-bold text-sm ${titleColor}`}>{title}</h3>
                <p className={`text-sm ${descColor} mt-1`}>{description}</p>
            </div>
        </div>
    );
}
