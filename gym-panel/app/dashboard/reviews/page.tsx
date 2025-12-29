'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import { reviewService, Review } from '@/services/reviewService';

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState({ total: 0, average: 0 });
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get Owner's Academy
            const { data: academy } = await supabase.rpc('get_my_academy').maybeSingle();

            if (academy) {
                const [reviewsData, statsData] = await Promise.all([
                    reviewService.getAcademyReviews((academy as any).id),
                    reviewService.getAcademyStats((academy as any).id)
                ]);
                setReviews(reviewsData || []);
                setStats(statsData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Carregando avaliações...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Avaliações & Feedback</h1>
                <p className="text-gray-600">Veja o que os alunos estão falando sobre sua academia.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                        <Star className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{stats.average}</div>
                        <div className="text-sm text-gray-500">Média Geral</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                        <div className="text-sm text-gray-500">Total de Avaliações</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900">Top 10%</div>
                        <div className="text-sm text-gray-500">Ranking na Região</div>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-lg text-gray-900">Avaliações Recentes</h2>
                </div>

                {reviews.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        Nenhuma avaliação recebida ainda. Incentive seus alunos a avaliarem!
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {reviews.map((review) => (
                            <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium text-gray-900">Usuário do App</div>
                                        <span className="text-gray-400">•</span>
                                        <div className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-gray-700 mb-3">{review.comment || "Sem comentário escrito."}</p>
                                {review.tags && review.tags.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {review.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
