import { supabase } from '../lib/supabase';

export interface Referral {
    id: string;
    referrer_id: string;
    referred_id: string | null;
    referral_code: string;
    referred_email: string | null;
    status: 'pending' | 'converted' | 'expired' | 'cancelled';
    converted_at: string | null;
    expires_at: string | null;
    created_at: string;
}

export interface ReferralReward {
    id: string;
    referral_id: string;
    user_id: string;
    discount_percentage: number;
    discount_amount: number | null;
    status: 'pending' | 'applied' | 'expired' | 'cancelled';
    applied_to_membership_id: string | null;
    applied_at: string | null;
    expires_at: string | null;
    created_at: string;
}

export interface ReferralStats {
    user_id: string;
    email: string;
    referral_code: string;
    total_invites: number;
    converted_invites: number;
    total_rewards: number;
    pending_rewards: number;
    applied_rewards: number;
    total_saved: number;
}

export const referralService = {
    /**
     * Buscar código de convite do usuário
     */
    async getMyReferralCode(userId: string): Promise<string> {
        const { data, error } = await supabase
            .from('users')
            .select('referral_code')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Se não tem código, gerar um
        if (!data.referral_code) {
            const { data: newCode } = await supabase.rpc('generate_referral_code');

            await supabase
                .from('users')
                .update({ referral_code: newCode })
                .eq('id', userId);

            return newCode;
        }

        return data.referral_code;
    },

    /**
     * Gerar link de convite
     */
    async getReferralLink(userId: string): Promise<string> {
        const code = await this.getMyReferralCode(userId);
        // TODO: Ajustar URL base para produção
        return `https://evolve.app/signup?ref=${code}`;
    },

    /**
     * Criar convite por email
     */
    async createReferralByEmail(referrerId: string, email: string) {
        const { data, error } = await supabase.rpc('create_referral', {
            p_referrer_id: referrerId,
            p_referred_email: email
        });

        if (error) throw error;
        return data;
    },

    /**
     * Buscar estatísticas de convites
     */
    async getMyStats(userId: string): Promise<ReferralStats> {
        const { data, error } = await supabase
            .from('referral_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data as ReferralStats;
    },

    /**
     * Buscar convites enviados
     */
    async getMyReferrals(userId: string) {
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Referral[];
    },

    /**
     * Buscar recompensas disponíveis
     */
    async getMyRewards(userId: string) {
        const { data, error } = await supabase
            .from('referral_rewards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ReferralReward[];
    },

    /**
     * Buscar recompensas pendentes
     */
    async getPendingRewards(userId: string) {
        const { data, error } = await supabase
            .from('referral_rewards')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as ReferralReward[];
    },

    /**
     * Converter convite (quando convidado assina)
     */
    async convertReferral(referralCode: string, referredUserId: string) {
        const { data, error } = await supabase.rpc('convert_referral', {
            p_referral_code: referralCode,
            p_referred_user_id: referredUserId
        });

        if (error) throw error;
        return data;
    },

    /**
     * Aplicar desconto de referral
     */
    async applyDiscount(userId: string, membershipId: string) {
        const { data, error } = await supabase.rpc('apply_referral_discount', {
            p_user_id: userId,
            p_membership_id: membershipId
        });

        if (error) throw error;
        return data;
    },

    /**
     * Validar código de convite
     */
    async validateReferralCode(code: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', code)
            .single();

        return !error && !!data;
    },

    /**
     * Buscar informações do convidador pelo código
     */
    async getReferrerByCode(code: string) {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('referral_code', code)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Compartilhar código (gera texto para compartilhamento)
     */
    async getShareText(userId: string): Promise<string> {
        const code = await this.getMyReferralCode(userId);
        const link = await this.getReferralLink(userId);

        return `🎁 Ganhe 10% de desconto na Evolve Fitness!\n\nUse meu código: ${code}\nOu acesse: ${link}\n\nTreinar nunca foi tão fácil! 💪`;
    }
};
