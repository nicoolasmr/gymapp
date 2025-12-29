import { supabase } from '../lib/supabase';

export const reviewService = {
    async submitReview(academyId: string, userId: string, rating: number, comment: string, tags: string[] = []) {
        const { data, error } = await supabase
            .from('academy_reviews')
            .insert({
                academy_id: academyId,
                user_id: userId,
                rating,
                comment,
                tags
            })
            .select()
            .single();

        if (error) {
            if (error.message.includes('User must have a validated check-in')) {
                throw new Error('Você só pode avaliar academias onde treinou nos últimos 30 dias.');
            }
            throw error;
        }
        return data;
    },

    async getAcademyReviews(academyId: string) {
        // In a real scenario with complex joins, we might use a View or RPC.
        // Here we select and manually filter/sort if needed, or rely on Supabase query.
        // Assuming we have a public profile view or we fetch user metadata separately.

        // For MVP, just get the reviews.
        const { data, error } = await supabase
            .from('academy_reviews')
            .select('*') // If you have profiles table: select('*, user:profiles(full_name, avatar_url)')
            .eq('academy_id', academyId)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
};
