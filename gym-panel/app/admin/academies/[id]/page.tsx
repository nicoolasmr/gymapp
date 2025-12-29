'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function EditAcademy({ params }: { params: { id: string } }) {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [academy, setAcademy] = useState<any>(null);

    // Form States
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [modality, setModality] = useState('');
    const [active, setActive] = useState(false);
    const [customRepasse, setCustomRepasse] = useState('');

    // JSON Fields (Editados como texto por enquanto para flexibilidade)
    const [photos, setPhotos] = useState(''); // JSON Array
    const [rules, setRules] = useState(''); // JSON Array
    const [amenities, setAmenities] = useState(''); // JSON Array
    const [openingHours, setOpeningHours] = useState(''); // JSON Object
    const [contacts, setContacts] = useState(''); // JSON Object

    useEffect(() => {
        fetchAcademy();
    }, []);

    const fetchAcademy = async () => {
        try {
            const { data, error } = await supabase
                .from('academies')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) throw error;

            setAcademy(data);
            setName(data.name || '');
            setDescription(data.description || '');
            setAddress(data.address || '');
            setModality(data.modality || '');
            setActive(data.active || false);
            setCustomRepasse(data.custom_repasse_value || '');

            // Format JSONs for textarea
            setPhotos(data.photos ? JSON.stringify(data.photos, null, 2) : '[\n  "https://exemplo.com/foto1.jpg"\n]');
            setRules(data.rules ? JSON.stringify(data.rules, null, 2) : '[\n  "Uso obrigatório de toalha",\n  "Agendamento via WhatsApp"\n]');
            setAmenities(data.amenities ? JSON.stringify(data.amenities, null, 2) : '[\n  "Ar Condicionado",\n  "Estacionamento"\n]');
            setOpeningHours(data.opening_hours ? JSON.stringify(data.opening_hours, null, 2) : '{\n  "seg-sex": "06:00 - 22:00",\n  "sab": "09:00 - 14:00"\n}');
            setContacts(data.contacts ? JSON.stringify(data.contacts, null, 2) : '{\n  "phone": "(11) 99999-9999",\n  "instagram": "@academia"\n}');

        } catch (error) {
            console.error('Erro ao carregar:', error);
            alert('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Validar JSONs
            const parseJson = (str: string, name: string) => {
                try {
                    return str.trim() ? JSON.parse(str) : null;
                } catch (e) {
                    throw new Error(`Erro no formato do campo ${name}`);
                }
            };

            const updates = {
                name,
                description,
                address,
                modality,
                active,
                custom_repasse_value: customRepasse ? parseFloat(customRepasse) : null,
                photos: parseJson(photos, 'Fotos'),
                rules: parseJson(rules, 'Regras'),
                amenities: parseJson(amenities, 'Comodidades'),
                opening_hours: parseJson(openingHours, 'Horários'),
                contacts: parseJson(contacts, 'Contatos'),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('academies')
                .update(updates)
                .eq('id', params.id);

            if (error) throw error;

            alert('Academia atualizada com sucesso!');
            router.push('/admin/academies');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            alert(error.message || 'Erro ao salvar alterações');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Editar Academia</h1>
                <div className="space-x-4">
                    <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Coluna Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Dados Básicos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Informações Básicas</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome</label>
                            <input
                                type="text" value={name} onChange={e => setName(e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Descrição (Sobre)</label>
                            <textarea
                                rows={4} value={description} onChange={e => setDescription(e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md"
                                placeholder="Conte um pouco sobre a academia..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço</label>
                            <input
                                type="text" value={address} onChange={e => setAddress(e.target.value)}
                                className="mt-1 w-full p-2 border rounded-md"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Modalidade</label>
                                <select
                                    value={modality} onChange={e => setModality(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded-md"
                                >
                                    <option value="gym_standard">Academia</option>
                                    <option value="crossfit_box">CrossFit</option>
                                    <option value="studio">Studio</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-600">{active ? 'Ativa' : 'Inativa'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configurações Avançadas (JSON) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Detalhes e Regras</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fotos (Lista de URLs)</label>
                                <textarea
                                    rows={5} value={photos} onChange={e => setPhotos(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded-md font-mono text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Regras / Avisos</label>
                                <textarea
                                    rows={5} value={rules} onChange={e => setRules(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded-md font-mono text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Comodidades</label>
                                <textarea
                                    rows={5} value={amenities} onChange={e => setAmenities(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded-md font-mono text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Horários</label>
                                <textarea
                                    rows={5} value={openingHours} onChange={e => setOpeningHours(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded-md font-mono text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Lateral */}
                <div className="space-y-6">
                    {/* Financeiro */}
                    <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                        <h2 className="text-lg font-bold text-orange-900 mb-4">Financeiro</h2>
                        <label className="block text-sm font-medium text-orange-800">Repasse Customizado (R$)</label>
                        <input
                            type="number" step="0.01" value={customRepasse} onChange={e => setCustomRepasse(e.target.value)}
                            className="mt-1 w-full p-2 border border-orange-200 rounded-md"
                            placeholder="Padrão do plano"
                        />
                        <p className="text-xs text-orange-600 mt-2">
                            Se preenchido, este valor sobrescreve a tabela de preços padrão.
                        </p>
                    </div>

                    {/* Contatos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Contatos</h2>
                        <textarea
                            rows={4} value={contacts} onChange={e => setContacts(e.target.value)}
                            className="w-full p-2 border rounded-md font-mono text-xs"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
