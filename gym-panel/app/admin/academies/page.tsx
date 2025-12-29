'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AdminAcademies() {
    const [academies, setAcademies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchAcademies();
    }, []);

    const fetchAcademies = async () => {
        try {
            const { data, error } = await supabase
                .from('academies')
                .select(`
                    *,
                    owner:users!owner_id(full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAcademies(data || []);
        } catch (error) {
            console.error('Erro ao buscar academias:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('academies')
                .update({ active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            // Atualizar lista localmente
            setAcademies(academies.map(acc =>
                acc.id === id ? { ...acc, active: !currentStatus } : acc
            ));
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Erro ao atualizar status da academia');
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestão de Academias</h1>
                    <p className="text-gray-600 mt-2">Aprove, bloqueie ou edite academias parceiras</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">
                    {academies.length} Academias Totais
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Academia</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Modalidade</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Dono</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Localização</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {academies.map((academy) => (
                            <tr key={academy.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{academy.name}</div>
                                    <div className="text-sm text-gray-500 text-xs mt-1">ID: {academy.id.slice(0, 8)}...</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${academy.modality === 'gym_standard' ? 'bg-blue-100 text-blue-800' :
                                            academy.modality === 'crossfit_box' ? 'bg-orange-100 text-orange-800' :
                                                'bg-purple-100 text-purple-800'}`}>
                                        {academy.modality === 'gym_standard' ? 'Academia' :
                                            academy.modality === 'crossfit_box' ? 'CrossFit' : 'Studio'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{academy.owner?.full_name || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{academy.owner?.email}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {academy.address}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${academy.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {academy.active ? 'Ativa' : 'Inativa'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <a
                                        href={`/admin/academies/${academy.id}`}
                                        className="text-sm font-medium px-3 py-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors inline-block"
                                    >
                                        Editar
                                    </a>
                                    <button
                                        onClick={() => toggleStatus(academy.id, academy.active)}
                                        className={`text-sm font-medium px-3 py-1 rounded-md transition-colors
                                            ${academy.active
                                                ? 'text-red-600 hover:bg-red-50'
                                                : 'text-green-600 hover:bg-green-50'}`}
                                    >
                                        {academy.active ? 'Bloquear' : 'Aprovar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {academies.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        Nenhuma academia encontrada.
                    </div>
                )}
            </div>
        </div>
    );
}
