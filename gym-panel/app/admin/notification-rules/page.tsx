'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Bell, ToggleLeft, ToggleRight, Edit } from 'lucide-react';

interface NotificationRule {
    id: string;
    rule_key: string;
    rule_type: string;
    condition: any;
    message_template: any;
    enabled: boolean;
    created_at: string;
}

export default function NotificationRulesPage() {
    const [rules, setRules] = useState<NotificationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const { data, error } = await supabase
                .from('notification_rules')
                .select('*')
                .order('created_at');

            if (error) throw error;
            setRules(data || []);
        } catch (error) {
            console.error('Error fetching rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRule = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('notification_rules')
                .update({ enabled: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchRules();
        } catch (error) {
            console.error('Error toggling rule:', error);
        }
    };

    const getRuleIcon = (type: string) => {
        switch (type) {
            case 'streak': return '🔥';
            case 'badge': return '🏅';
            case 'mission': return '🎯';
            case 'insight': return '📊';
            default: return '🔔';
        }
    };

    const getRuleName = (key: string) => {
        const names: { [key: string]: string } = {
            'streak_at_risk': 'Streak em Risco',
            'badge_unlocked': 'Nova Badge Desbloqueada',
            'weekly_mission_available': 'Missão Semanal Disponível',
            'academy_peak_hour': 'Pico de Usuários',
            'critical_insight': 'Insight Crítico',
        };
        return names[key] || key;
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Bell className="w-8 h-8 text-blue-600" />
                    Regras de Notificação
                </h1>
                <p className="text-gray-600">Gerencie as regras automáticas de notificação</p>
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className={`bg-white rounded-xl border-2 p-6 transition-all ${rule.enabled
                                ? 'border-green-200 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{getRuleIcon(rule.rule_type)}</div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{getRuleName(rule.rule_key)}</h3>
                                    <p className="text-sm text-gray-500 capitalize">{rule.rule_type}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleRule(rule.id, rule.enabled)}
                                className={`p-2 rounded-lg transition-colors ${rule.enabled
                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                            >
                                {rule.enabled ? (
                                    <ToggleRight className="w-6 h-6" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        {/* Message Template */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                                {rule.message_template.title}
                            </div>
                            <div className="text-sm text-gray-600">
                                {rule.message_template.message}
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="text-xs text-gray-500 mb-4">
                            <span className="font-medium">Condição:</span>{' '}
                            {JSON.stringify(rule.condition)}
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${rule.enabled
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                {rule.enabled ? '✓ Ativa' : '✗ Inativa'}
                            </span>
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                                <Edit className="w-4 h-4" />
                                Editar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Regras Ativas</div>
                    <div className="text-4xl font-bold">
                        {rules.filter(r => r.enabled).length}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Regras Inativas</div>
                    <div className="text-4xl font-bold">
                        {rules.filter(r => !r.enabled).length}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Total de Regras</div>
                    <div className="text-4xl font-bold">{rules.length}</div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-2">🔔 Regras Automáticas</h3>
                <p className="text-blue-800 text-sm">
                    Estas regras disparam notificações automaticamente quando as condições são atendidas.
                    Ative ou desative conforme necessário.
                </p>
            </div>
        </div>
    );
}
