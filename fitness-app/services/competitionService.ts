import { supabase } from '../lib/supabase';

export interface Competition {
    id: string;
    creator_id: string;
    name: string;
    description: string | null;
    modality_filter: 'gym_standard' | 'crossfit_box' | 'studio' | 'all';
    scoring_rule: 'total_checkins' | 'streak_days' | 'unique_academies';
    start_date: string;
    end_date: string;
    status: 'draft' | 'active' | 'ended' | 'cancelled';
    is_public: boolean;
    max_participants: number | null;
    prize_description: string | null;
    created_at: string;
}

export interface CompetitionParticipant {
    id: string;
    competition_id: string;
    user_id: string;
    status: 'pending' | 'accepted' | 'declined' | 'removed';
    score: number;
    rank: number | null;
    total_checkins: number;
    current_streak: number;
    max_streak: number;
    unique_academies: number;
    joined_at: string;
}

export interface LeaderboardEntry {
    competition_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    rank: number;
    score: number;
    total_checkins: number;
    current_streak: number;
    max_streak: number;
    unique_academies: number;
}

export const competitionService = {
    /**
     * Buscar competições do usuário
     */
    async getMyCompetitions(userId: string) {
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .eq('creator_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Competition[];
    },

    /**
     * Buscar competições que o usuário foi convidado
     */
    async getInvitedCompetitions(userId: string) {
        const { data, error } = await supabase
            .from('competition_participants')
            .select(`
                *,
                competitions (*)
            `)
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('joined_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Buscar competições que o usuário está participando
     */
    async getActiveParticipations(userId: string) {
        const { data, error } = await supabase
            .from('competition_participants')
            .select(`
                *,
                competitions (*)
            `)
            .eq('user_id', userId)
            .eq('status', 'accepted')
            .order('joined_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Buscar competições públicas
     */
    async getPublicCompetitions() {
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .eq('is_public', true)
            .eq('status', 'active')
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data as Competition[];
    },

    /**
     * Criar nova competição
     */
    async createCompetition(competition: {
        name: string;
        description?: string;
        modality_filter: string;
        scoring_rule: string;
        start_date: string;
        end_date: string;
        is_public?: boolean;
        max_participants?: number;
        prize_description?: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data, error } = await supabase
            .from('competitions')
            .insert({
                ...competition,
                creator_id: user.id,
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;

        // Adicionar criador como participante automaticamente
        await this.addParticipant(data.id, user.id, user.id);

        return data as Competition;
    },

    /**
     * Adicionar participante à competição
     */
    async addParticipant(competitionId: string, userId: string, invitedBy: string) {
        // 1. Try Secure RPC (Preferred if updated)
        if (userId === invitedBy) {
            try {
                const { data, error } = await supabase.rpc('join_competition', {
                    p_competition_id: competitionId
                });
                if (!error) return data;
                console.warn('RPC join_competition failed (probably missing), falling back to standard Insert.', error);
            } catch (err) {
                console.warn('RPC Exception:', err);
            }
        }

        // 2. Fallback: Standard Insert/Upsert (Requires RLS Policy & Column)
        const { data, error } = await supabase
            .from('competition_participants')
            .upsert({
                competition_id: competitionId,
                user_id: userId,
                invited_by: invitedBy,
                status: userId === invitedBy ? 'accepted' : 'pending',
                updated_at: new Date().toISOString()
            }, { onConflict: 'competition_id, user_id' })
            .select()
            .single();

        if (error) {
            console.error('Standard Join Failed:', error);
            throw error;
        }
        return data;
    },

    /**
     * Aceitar convite para competição
     */
    async acceptInvite(competitionId: string, userId: string) {
        const { data, error } = await supabase
            .from('competition_participants')
            .update({ status: 'accepted' })
            .eq('competition_id', competitionId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        // Atualizar pontuação inicial
        await supabase.rpc('update_participant_score', {
            p_competition_id: competitionId,
            p_user_id: userId
        });

        // Atualizar ranking
        await supabase.rpc('update_competition_rankings', {
            p_competition_id: competitionId
        });

        return data;
    },

    /**
     * Recusar convite para competição
     */
    async declineInvite(competitionId: string, userId: string) {
        const { data, error } = await supabase
            .from('competition_participants')
            .update({ status: 'declined' })
            .eq('competition_id', competitionId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Sair da competição
     */
    async leaveCompetition(competitionId: string, userId: string) {
        // 1. Try Secure RPC
        try {
            const { error } = await supabase.rpc('leave_competition', {
                p_competition_id: competitionId
            });
            if (!error) return;
            console.warn('RPC leave_competition failed, trying standard delete:', error);
        } catch (err) {
            console.warn('RPC Exception:', err);
        }

        // 2. Fallback: Standard Delete
        const { error } = await supabase
            .from('competition_participants')
            .delete()
            .eq('competition_id', competitionId)
            .eq('user_id', userId);

        if (error) {
            console.error('Standard Leave Failed:', error);
            throw error;
        }
    },

    /**
     * Buscar ranking da competição
     */
    async getLeaderboard(competitionId: string) {
        const { data, error } = await supabase
            .from('competition_leaderboard')
            .select('*')
            .eq('competition_id', competitionId)
            .order('rank', { ascending: true });

        if (error) throw error;
        return data as LeaderboardEntry[];
    },

    /**
     * Buscar detalhes da competição
     */
    async getCompetitionDetails(competitionId: string) {
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .eq('id', competitionId)
            .single();

        if (error) throw error;
        return data as Competition;
    },

    /**
     * Buscar participantes da competição
     */
    async getParticipants(competitionId: string) {
        const { data, error } = await supabase
            .from('competition_participants')
            .select('*')
            .eq('competition_id', competitionId)
            .order('rank', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Atualizar competição
     */
    async updateCompetition(competitionId: string, updates: Partial<Competition>) {
        const { data, error } = await supabase
            .from('competitions')
            .update(updates)
            .eq('id', competitionId)
            .select()
            .single();

        if (error) throw error;
        return data as Competition;
    },

    /**
     * Cancelar competição
     */
    async cancelCompetition(competitionId: string) {
        return this.updateCompetition(competitionId, { status: 'cancelled' });
    },

    /**
     * Encerrar competição manualmente
     */
    async endCompetition(competitionId: string) {
        return this.updateCompetition(competitionId, { status: 'ended' });
    },

    /**
     * Buscar usuários para convidar (busca por email)
     */
    async searchUsers(query: string) {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email')
            .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return data;
    }
};
