'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_action_logs')
                .select(`
                    *,
                    admin:users!admin_id(full_name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Logs de Auditoria</h1>
                    <p className="text-gray-600 mt-2">Histórico de ações administrativas</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Data/Hora</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Admin</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Ação</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Alvo</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{log.admin?.full_name || 'Sistema'}</div>
                                    <div className="text-xs text-gray-500">{log.admin?.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 font-mono">
                                        {log.action_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {log.target_type ? `${log.target_type} (${log.target_id?.slice(0, 8)})` : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                    {log.changes ? JSON.stringify(log.changes) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {logs.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        Nenhum log registrado ainda.
                    </div>
                )}
            </div>
        </div>
    );
}
