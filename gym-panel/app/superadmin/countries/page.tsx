'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Globe, Plus, Edit, Trash2, Check, X } from 'lucide-react';

interface Country {
    id: string;
    name: string;
    code: string;
    currency: string;
    currency_symbol: string;
    locale: string;
    timezone_default: string;
    flag_emoji: string;
    is_active: boolean;
}

export default function CountriesManagementPage() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        try {
            const { data, error } = await supabase
                .from('countries')
                .select('*')
                .order('name');

            if (error) throw error;
            setCountries(data || []);
        } catch (error) {
            console.error('Error fetching countries:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('countries')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchCountries();
        } catch (error) {
            console.error('Error updating country:', error);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Globe className="w-8 h-8 text-purple-600" />
                        Gestão de Países
                    </h1>
                    <p className="text-gray-600">Gerencie os países suportados pela plataforma</p>
                </div>
                <button
                    onClick={() => alert('Funcionalidade de adicionar país será implementada na próxima sprint')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Adicionar País
                </button>
            </div>

            {/* Countries Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">País</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Código</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Moeda</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Locale</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Timezone</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {countries.map((country) => (
                            <tr key={country.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{country.flag_emoji}</span>
                                        <span className="font-medium text-gray-900">{country.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{country.code}</td>
                                <td className="px-6 py-4">
                                    <span className="font-medium text-gray-900">
                                        {country.currency_symbol} {country.currency}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{country.locale}</td>
                                <td className="px-6 py-4 text-gray-600 text-sm">{country.timezone_default}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleActive(country.id, country.is_active)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${country.is_active
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {country.is_active ? (
                                            <span className="flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Ativo
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <X className="w-3 h-3" /> Inativo
                                            </span>
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => alert(`Editar país: ${country.name}`)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Tem certeza que deseja excluir ${country.name}?`)) {
                                                    alert('Funcionalidade de exclusão será implementada');
                                                }
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Países Ativos</div>
                    <div className="text-4xl font-bold">
                        {countries.filter(c => c.is_active).length}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Países Inativos</div>
                    <div className="text-4xl font-bold">
                        {countries.filter(c => !c.is_active).length}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">Total de Países</div>
                    <div className="text-4xl font-bold">{countries.length}</div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-bold text-purple-900 mb-2">🌍 Gestão de Países</h3>
                <p className="text-purple-800 text-sm">
                    Adicione ou remova países da plataforma. Cada país pode ter sua própria moeda,
                    timezone e configurações regionais.
                </p>
            </div>
        </div>
    );
}
