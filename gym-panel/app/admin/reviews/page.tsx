'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageSquare, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Review {
    id: string;
    rating: number;
    comment: string;
    status: string;
    helpful_count: number;
    created_at: string;
    user_id: string;
    academy_id: string;
    academy?: { name: string };
    // user info omitted for privacy in MVP, fetched if needed
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'flagged'>('all');

    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchReviews();
    }, [filter]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('academy_reviews')
                .select('*, academy:academies(name)')
                .order('created_at', { ascending: false });

            if (filter === 'flagged') {
                // In MVP logic, flagged might mean receiving reports. 
                // For now, let's just list reviews with status='flagged' manually set
                query = query.eq('status', 'flagged');
            }

            const { data, error } = await query;
            if (error) throw error;
            setReviews(data as any || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'hide') => {
        const newStatus = action === 'approve' ? 'published' : 'hidden';

        try {
            await supabase
                .from('academy_reviews')
                .update({ status: newStatus })
                .eq('id', id);

            // Optimistic update
            setReviews(reviews.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Moderação de Reviews</h1>
                    <p className="text-gray-600">Monitore o conteúdo gerado pelos usuários.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                    >Todos</button>
                    <button
                        onClick={() => setFilter('flagged')}
                        className={`px-4 py-2 rounded-lg ${filter === 'flagged' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
                    >Denunciados</button>
                </div>
            </div>

            {loading ? (
                <div>Carregando...</div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Academia</th>
                                <th className="p-4">Nota</th>
                                <th className="p-4 w-1/3">Comentário</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reviews.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-medium">{r.academy?.name || 'Unknown'}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${r.rating >= 4 ? 'text-green-600' : r.rating <= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                                            {r.rating} ★
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-700">{r.comment}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                            ${r.status === 'published' ? 'bg-green-100 text-green-800' :
                                                r.status === 'hidden' ? 'bg-gray-100 text-gray-500' :
                                                    'bg-red-100 text-red-800'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        {r.status !== 'published' && (
                                            <button onClick={() => handleAction(r.id, 'approve')} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Aprovar">
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        {r.status !== 'hidden' && (
                                            <button onClick={() => handleAction(r.id, 'hide')} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Ocultar">
                                                <XCircle size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
