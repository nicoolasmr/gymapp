import { supabase } from '../lib/supabase';

export interface Referral {
    id: string;
    referrer_id: string;
    referred_user_id: string | null;
    status: 'invited' | 'signed_up' | 'paid' | 'rewarded';
    created_at: string;
}

export const referralService = {
    /**
     * Get or create the user's unique referral code
     */
    async getMyReferralCode(userId: string): Promise<string> {
        // We use the robust RPC that handles creation/fetching
        const { data, error } = await supabase.rpc('get_or_create_referral_code');

        if (error) throw error;
        return data as string;
    },

    /**
     * Validate a code entered during signup
     */
    async validateReferralCode(code: string): Promise<{ valid: boolean; referrer_id?: string; reason?: string }> {
        const { data, error } = await supabase.rpc('validate_referral_code', { p_code: code });

        if (error) throw error;
        return data as { valid: boolean; referrer_id?: string; reason?: string };
    },

    /**
     * Get Share Text
     */
    async getShareText(code: string): Promise<string> {
        // App Store / Play Store Links (Placeholder)
        const link = `https://gymapp.com/signup?ref=${code}`;
        return `🎁 Ganhe 10% de desconto na primeira mensalidade do Evolve Fitness!\n\nUse meu código: ${code}\nOu baixe agora: ${link}\n\nTreinar nunca foi tão fácil! 💪`;
    },

    /**
     * Get history of referrals
     */
    async getMyReferrals() {
        // RLS guarantees user only sees their own
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Referral[];
    }
};

