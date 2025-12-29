import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface Review {
    id: string;
    academy_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    tags: string[];
    created_at: string;
    user?: {
        full_name: string;
        avatar_url: string;
    };
}

export const reviewService = {
    async getAcademyReviews(academyId: string) {
        const supabase = createClientComponentClient();

        // Join with auth.users is tricky client-side if public access is restricted
        // Assuming we have a public profile table or RLS allows reading basic user info
        // For MVP, simplistic fetch
        const { data, error } = await supabase
            .from('academy_reviews')
            .select('*') // In a real app, join with profiles
            .eq('academy_id', academyId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Review[];
    },

    async getAcademyStats(academyId: string) {
        const supabase = createClientComponentClient();

        const { data, error } = await supabase
            .from('academy_reviews')
            .select('rating')
            .eq('academy_id', academyId);

        if (error) throw error;

        const total = data.length;
        const average = total > 0
            ? data.reduce((acc, curr) => acc + curr.rating, 0) / total
            : 0;

        return {
            total,
            average: parseFloat(average.toFixed(1))
        };
    }
};
