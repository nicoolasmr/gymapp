'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Plus, Edit2, Trash2, Gift, Image as ImageIcon } from 'lucide-react';

interface Benefit {
    id: string;
    title: string;
    description: string;
    category: string;
    image_url: string;
    coupon_code: string;
    discount_value: string;
    quantity_limit: number;
    quantity_used: number;
    is_premium_only: boolean;
    is_active: boolean;
    expires_at: string;
}

const CATEGORIES = [
    { value: 'supplements', label: 'Suplementos', icon: '💊' },
    { value: 'clothing', label: 'Roupas Fitness', icon: '👕' },
    { value: 'food', label: 'Alimentação Saudável', icon: '🥗' },
    { value: 'wellness', label: 'Bem-estar', icon: '🧘' },
    { value: 'recovery', label: 'Recuperação', icon: '💆' },
    { value: 'personal_care', label: 'Cuidados Pessoais', icon: '🧴' }
];

export default function BenefitsManagementPage() {
    const [benefits, setBenefits] = useState<Benefit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
    const [academyId, setAcademyId] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'supplements',
        image_url: '',
        coupon_code: '',
        discount_value: '',
        quantity_limit: 0,
        is_premium_only: false,
        expires_at: ''
    });

    useEffect(() => {
        fetchBenefits();
    }, []);

    const fetchBenefits = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: academy } = await supabase.rpc('get_my_academy').maybeSingle();
            if (!academy) return;

            setAcademyId((academy as any).id);

            const { data: benefitsData } = await supabase
                .from('marketplace_benefits')
                .select('*')
                .eq('academy_id', (academy as any).id)
                .order('created_at', { ascending: false });

            if (benefitsData) {
                setBenefits(benefitsData);
            }
        } catch (error) {
            console.error('Error fetching benefits:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!academyId) return;

        try {
            if (editingBenefit) {
                // Update
                const { error } = await supabase
                    .from('marketplace_benefits')
                    .update({
                        ...formData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingBenefit.id);

                if (error) throw error;
                alert('Oferta atualizada com sucesso!');
            } else {
                // Create
                const { error } = await supabase
                    .from('marketplace_benefits')
                    .insert({
                        ...formData,
                        academy_id: academyId,
                        is_active: true
                    });

                if (error) throw error;
                alert('Oferta criada com sucesso!');
            }

            setShowModal(false);
            setEditingBenefit(null);
            resetForm();
            fetchBenefits();
        } catch (error) {
            console.error('Error saving benefit:', error);
            alert('Erro ao salvar oferta');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta oferta?')) return;

        try {
            const { error } = await supabase
                .from('marketplace_benefits')
                .delete()
                .eq('id', id);

            if (error) throw error;
            alert('Oferta excluída com sucesso!');
            fetchBenefits();
        } catch (error) {
            console.error('Error deleting benefit:', error);
            alert('Erro ao excluir oferta');
        }
    };

    const handleEdit = (benefit: Benefit) => {
        setEditingBenefit(benefit);
        setFormData({
            title: benefit.title,
            description: benefit.description || '',
            category: benefit.category,
            image_url: benefit.image_url || '',
            coupon_code: benefit.coupon_code || '',
            discount_value: benefit.discount_value || '',
            quantity_limit: benefit.quantity_limit || 0,
            is_premium_only: benefit.is_premium_only,
            expires_at: benefit.expires_at ? benefit.expires_at.split('T')[0] : ''
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            category: 'supplements',
            image_url: '',
            coupon_code: '',
            discount_value: '',
            quantity_limit: 0,
            is_premium_only: false,
            expires_at: ''
        });
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Ofertas & Benefícios</h1>
                    <p className="text-gray-600">Gerencie as ofertas da sua academia no marketplace</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setEditingBenefit(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nova Oferta
                </button>
            </div>

            {/* Benefits List */}
            {benefits.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma oferta criada</h3>
                    <p className="text-gray-500 mb-6">Comece criando sua primeira oferta no marketplace</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Criar Primeira Oferta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {benefits.map((benefit) => {
                        const category = CATEGORIES.find(c => c.value === benefit.category);
                        return (
                            <div key={benefit.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Image */}
                                <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                    {benefit.image_url ? (
                                        <img src={benefit.image_url} alt={benefit.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-16 h-16 text-gray-400" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <span className="text-2xl mr-2">{category?.icon}</span>
                                            <span className="text-xs font-medium text-gray-500 uppercase">{category?.label}</span>
                                        </div>
                                        {benefit.is_premium_only && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                                💎 Premium
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{benefit.description}</p>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Desconto:</span>
                                            <span className="font-medium text-green-600">{benefit.discount_value}</span>
                                        </div>
                                        {benefit.coupon_code && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Cupom:</span>
                                                <code className="px-2 py-1 bg-gray-100 rounded font-mono text-xs">{benefit.coupon_code}</code>
                                            </div>
                                        )}
                                        {benefit.quantity_limit > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Disponível:</span>
                                                <span className="font-medium">{benefit.quantity_limit - benefit.quantity_used}/{benefit.quantity_limit}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(benefit)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(benefit.id)}
                                            className="flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {editingBenefit ? 'Editar Oferta' : 'Nova Oferta'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">URL da Imagem</label>
                                <input
                                    type="url"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor do Desconto *</label>
                                    <input
                                        type="text"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="10% ou R$ 50"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Código do Cupom</label>
                                    <input
                                        type="text"
                                        value={formData.coupon_code}
                                        onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="ACADEMIA10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade Limite (0 = ilimitado)</label>
                                    <input
                                        type="number"
                                        value={formData.quantity_limit}
                                        onChange={(e) => setFormData({ ...formData, quantity_limit: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data de Expiração</label>
                                    <input
                                        type="date"
                                        value={formData.expires_at}
                                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="premium"
                                    checked={formData.is_premium_only}
                                    onChange={(e) => setFormData({ ...formData, is_premium_only: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded"
                                />
                                <label htmlFor="premium" className="text-sm text-gray-700">
                                    💎 Disponível apenas para usuários Premium
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingBenefit(null);
                                        resetForm();
                                    }}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingBenefit ? 'Atualizar' : 'Criar'} Oferta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
