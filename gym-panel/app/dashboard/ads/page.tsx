'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Megaphone, Eye, MousePointer, PlusCircle } from 'lucide-react';

interface AdStat {
    campaign_id: string;
    title: string;
    status: string;
    impressions: number;
    clicks: number;
    ctr_percentage: number;
}

export default function AdsDashboardPage() {
    const [campaigns, setCampaigns] = useState<AdStat[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        try {
            // In a real app, join with academies or filter by owner logic
            const { data } = await supabase.from('view_ads_performance').select('*');
            setCampaigns(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = () => {
        // Logic to redirect to creation wizard or open modal
        alert("Em breve: Fluxo de criação com Stripe Checkout!");
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Campanhas Patrocinadas</h1>
                    <p className="text-gray-600">Aumente sua visibilidade no app e atraia mais alunos.</p>
                </div>
                <button
                    onClick={handleCreateCampaign}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                >
                    <PlusCircle size={20} />
                    Nova Campanha
                </button>
            </div>

            {/* Campaign List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
                        <tr>
                            <th className="p-4">Campanha</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Impressões</th>
                            <th className="p-4 text-center">Cliques</th>
                            <th className="p-4 text-center">CTR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {campaigns.map((ad) => (
                            <tr key={ad.campaign_id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-900">{ad.title}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                        ${ad.status === 'active' ? 'bg-green-100 text-green-800' :
                                            'bg-yellow-100 text-yellow-800'}`}>
                                        {ad.status === 'active' ? 'Ativa' : 'Pendente'}
                                    </span>
                                </td>
                                <td className="p-4 text-center flex items-center justify-center gap-1">
                                    <Eye size={16} className="text-gray-400" /> {ad.impressions}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <MousePointer size={16} className="text-gray-400" /> {ad.clicks}
                                    </div>
                                </td>
                                <td className="p-4 text-center font-bold text-indigo-600">
                                    {ad.ctr_percentage}%
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-500 flex flex-col items-center">
                                    <Megaphone className="w-12 h-12 text-gray-300 mb-4" />
                                    Nenhuma campanha ativa. Crie a primeira para se destacar!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
