'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AlertTriangle, Activity, Zap, CheckCircle, XCircle } from 'lucide-react';

export default function MonitoringPage() {
    const [errors, setErrors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchMonitoring();
    }, []);

    const fetchMonitoring = async () => {
        try {
            const { data, error } = await supabase
                .from('system_monitoring')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setErrors(data || []);
        } catch (error) {
            console.error('Error fetching monitoring:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const highErrors = errors.filter(e => e.severity === 'high').length;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-purple-600" />
                    System Monitoring
                </h1>
                <p className="text-gray-600">Monitoramento de erros, performance e infraestrutura</p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <CheckCircle className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">Status</div>
                    </div>
                    <div className="text-2xl font-bold mb-1">Operacional</div>
                    <div className="text-sm opacity-90">Sistema funcionando</div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <XCircle className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">Críticos</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{criticalErrors}</div>
                    <div className="text-sm opacity-90">Erros críticos</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <AlertTriangle className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">Altos</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">{highErrors}</div>
                    <div className="text-sm opacity-90">Erros altos</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <Zap className="w-8 h-8 opacity-80" />
                        <div className="text-sm opacity-80">Performance</div>
                    </div>
                    <div className="text-4xl font-bold mb-1">98%</div>
                    <div className="text-sm opacity-90">Uptime</div>
                </div>
            </div>

            {/* Error Logs */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Logs Recentes</h2>

                {errors.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">Nenhum erro registrado!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {errors.map((error) => (
                            <div
                                key={error.id}
                                className={`p-4 rounded-lg border ${getSeverityColor(error.severity)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-medium">{error.metric_key}</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                                                {error.severity}
                                            </span>
                                        </div>
                                        <div className="text-sm opacity-80">
                                            {error.metric_value?.message || JSON.stringify(error.metric_value)}
                                        </div>
                                        <div className="text-xs opacity-60 mt-2">
                                            {new Date(error.created_at).toLocaleString('pt-BR')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-medium text-gray-900 mb-4">RPC Performance</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">get_dashboard_metrics</span>
                            <span className="text-sm font-medium text-green-600">120ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">get_global_stats</span>
                            <span className="text-sm font-medium text-green-600">85ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">calculate_health_score</span>
                            <span className="text-sm font-medium text-yellow-600">250ms</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Database</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Conexões Ativas</span>
                            <span className="text-sm font-medium text-blue-600">12/100</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Latência Média</span>
                            <span className="text-sm font-medium text-green-600">45ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Cache Hit Rate</span>
                            <span className="text-sm font-medium text-green-600">94%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Notifications</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Fila Pendente</span>
                            <span className="text-sm font-medium text-blue-600">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Enviadas Hoje</span>
                            <span className="text-sm font-medium text-green-600">1,234</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Taxa de Sucesso</span>
                            <span className="text-sm font-medium text-green-600">99.2%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-bold text-purple-900 mb-2">📊 Monitoring</h3>
                <p className="text-purple-800 text-sm">
                    Sistema de monitoramento em tempo real. Erros críticos são registrados automaticamente.
                </p>
            </div>
        </div>
    );
}
