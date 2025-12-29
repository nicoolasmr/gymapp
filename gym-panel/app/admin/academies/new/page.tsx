'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function NewAcademy() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [creating, setCreating] = useState(false);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [modality, setModality] = useState('gym_standard');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const { data, error } = await supabase.rpc('create_academy_admin', {
                p_name: name,
                p_address: address,
                p_modality: modality
            });

            if (error) throw error;

            alert('Academia criada com sucesso! Agora você pode editá-la para adicionar fotos e detalhes.');
            router.push(`/admin/academies/${data}`);
        } catch (error: any) {
            console.error('Erro ao criar academia:', error);
            alert(error.message || 'Erro ao criar academia');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 mb-2">
                    ← Voltar
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Adicionar Nova Academia</h1>
                <p className="text-gray-600 mt-2">Preencha os dados básicos. Você poderá adicionar fotos e detalhes depois.</p>
            </div>

            <form onSubmit={handleCreate} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome da Academia *
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: CrossFit Copacabana"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endereço Completo *
                    </label>
                    <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: Av. Atlântica, 2616 - Copacabana, Rio de Janeiro"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modalidade *
                    </label>
                    <select
                        value={modality}
                        onChange={(e) => setModality(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="gym_standard">Academia (Musculação)</option>
                        <option value="crossfit_box">CrossFit Box</option>
                        <option value="studio">Studio (Yoga, Pilates, etc)</option>
                    </select>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>ℹ️ Importante:</strong> A academia será criada como <strong>Inativa</strong> por padrão.
                        Após preencher fotos, horários e outros detalhes, você pode ativá-la na tela de edição.
                    </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={creating}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {creating ? 'Criando...' : 'Criar Academia'}
                    </button>
                </div>
            </form>
        </div>
    );
}
