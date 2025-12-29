'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface NotificationLog {
    id: string;
    notification_id: string;
    status: string;
    error_message: string | null;
    sent_to: string;
    created_at: string;
}

export default function NotificationLogsPage() {
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('notification_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredLogs = () => {
        if (filter === 'all') return logs;
        return logs.filter(log => log.status === filter);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent': return 'bg-green-100 text-green-700 border-green-200';
            case 'failed': return 'bg-red-100 text-red-700 border-red-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return <CheckCircle className="w-5 h-5" />;
            case 'failed': return <XCircle className="w-5 h-5" />;
            case 'pending': return <Clock className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const filteredLogs = getFilteredLogs();
    const stats = {
        sent: logs.filter(l => l.status === 'sent').length,
        failed: logs.filter(l => l.status === 'failed').length,
        pending: logs.filter(l => l.status === 'pending').length,
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    Logs de Notificações
                </h1>
                <p className="text-gray-600">Histórico de envios de notificações</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="text-sm text-gray-600 mb-2">Total</div>
                    <div className="text-3xl font-bold text-gray-900">{logs.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Enviadas</div>
                    <div className="text-3xl font-bold">{stats.sent}</div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Falhas</div>
                    <div className="text-3xl font-bold">{stats.failed}</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Pendentes</div>
                    <div className="text-3xl font-bold">{stats.pending}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {['all', 'sent', 'failed', 'pending'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status as any)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Enviado Para</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Erro</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Data/Hora</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                    Nenhum log encontrado
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(log.status)}`}>
                                            {getStatusIcon(log.status)}
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 font-mono text-sm">
                                        {log.sent_to || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">
                                        {log.error_message || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-sm">
                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-2">📝 Logs de Envio</h3>
                <p className="text-blue-800 text-sm">
                    Todos os envios de notificações são registrados aqui. Use os filtros para encontrar logs específicos.
                </p>
            </div>
        </div>
    );
}
