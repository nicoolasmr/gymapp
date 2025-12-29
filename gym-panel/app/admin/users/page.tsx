'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const changeRole = async (id: string, newRole: string) => {
        if (!confirm(`Tem certeza que deseja mudar o papel deste usuário para ${newRole}?`)) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', id);

            if (error) throw error;

            setUsers(users.map(u =>
                u.id === id ? { ...u, role: newRole } : u
            ));
        } catch (error) {
            console.error('Erro ao atualizar role:', error);
            alert('Erro ao atualizar permissão');
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
                    <p className="text-gray-600 mt-2">Gerencie permissões e visualize usuários</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">
                    {users.length} Usuários
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Usuário</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Email</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Role Atual</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Código Convite</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{user.full_name || 'Sem nome'}</div>
                                    <div className="text-xs text-gray-500 mt-1">ID: {user.id.slice(0, 8)}...</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {user.email}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase
                                        ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                user.role === 'partner' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                        {user.role || 'user'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                    {user.referral_code || '-'}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <a
                                        href={`/admin/users/${user.id}`}
                                        className="text-sm font-medium px-3 py-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors inline-block"
                                    >
                                        Detalhes
                                    </a>
                                    <select
                                        value={user.role || 'user'}
                                        onChange={(e) => changeRole(user.id, e.target.value)}
                                        disabled={user.role === 'super_admin'}
                                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="user">User</option>
                                        <option value="partner">Partner</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
