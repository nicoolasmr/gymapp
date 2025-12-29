'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AlertTriangle, Ban, CheckCircle } from 'lucide-react';

interface SuspiciousUser {
    user_id: string;
    user_email: string;
    checkin_count: number;
    distinct_academies: number;
    last_checkin: string;
    suspicion_reason: string;
}

export default function AdminFraudPage() {
    const [suspicious, setSuspicious] = useState<SuspiciousUser[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchSuspicious();
    }, []);

    const fetchSuspicious = async () => {
        try {
            const { data } = await supabase.rpc('detect_suspicious_checkins');
            setSuspicious(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBlock = async (userId: string, reason: string) => {
        if (!confirm(`Tem certeza que deseja bloquear este usuário?\nMotivo: ${reason}`)) return;

        const { data, error } = await supabase.rpc('admin_block_user', {
            p_user_id: userId,
            p_block: true,
            p_reason: reason,
        });

        if (error) {
            alert('Erro: ' + error.message);
        } else {
            alert('Usuário bloqueado com sucesso!');
            fetchSuspicious();
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Anti-Fraude</h1>
                    <p className="text-gray-600">Detecção automática de atividades suspeitas</p>
                </div>
                <button
                    onClick={fetchSuspicious}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                    Atualizar Análise
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : suspicious.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-900 mb-2">Tudo Limpo!</h3>
                    <p className="text-green-700">Nenhuma atividade suspeita detectada no momento.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-red-50 text-red-700 text-sm uppercase font-medium">
                            <tr>
                                <th className="p-4">Usuário</th>
                                <th className="p-4 text-center">Check-ins</th>
                                <th className="p-4 text-center">Academias Distintas</th>
                                <th className="p-4">Último Check-in</th>
                                <th className="p-4">Motivo da Suspeita</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {suspicious.map((user) => (
                                <tr key={user.user_id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{user.user_email}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                                            {user.checkin_count}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">{user.distinct_academies}</td>
                                    <td className="p-4 text-gray-600 text-sm">
                                        {new Date(user.last_checkin).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                            {user.suspicion_reason}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleBlock(user.user_id, user.suspicion_reason)}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold mx-auto"
                                        >
                                            <Ban size={16} />
                                            Bloquear
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                        <h3 className="font-bold text-blue-900 mb-2">Critérios de Detecção</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• <strong>Múltiplas Academias:</strong> Mais de 3 academias diferentes no mesmo dia</li>
                            <li>• <strong>Alta Frequência:</strong> Mais de 20 check-ins em 7 dias</li>
                            <li>• <strong>Padrões Geográficos:</strong> Check-ins em locais muito distantes em curto período (futuro)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
