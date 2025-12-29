import { supabase } from '../lib/supabase';

export const userService = {
    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },

    async updateUserProfile(userId: string, updates: { full_name?: string; avatar_url?: string }) {
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
        if (error) throw error;
    },

    async getMembership(userId: string) {
        const { data, error } = await supabase
            .from('memberships')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
    },

    async getCheckinHistory(userId: string) {
        const { data, error } = await supabase
            .from('checkins')
            .select('*, academies(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getStats(userId: string) {
        // 1. Total Checkins
        const { count, error } = await supabase
            .from('checkins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw error;

        // 2. Streak Calculation (Simple version: consecutive days backwards from today)
        // In a real app, this might be a stored procedure or a more complex query
        const { data: checkins } = await supabase
            .from('checkins')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        let streak = 0;
        if (checkins && checkins.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if trained today
            const lastCheckin = new Date(checkins[0].created_at);
            lastCheckin.setHours(0, 0, 0, 0);

            if (lastCheckin.getTime() === today.getTime()) {
                streak = 1;
            }

            // Logic for previous days would go here (simplified for MVP)
            // For MVP 0.2, we'll just return total count and a mock streak if > 0
            if (count && count > 0) streak = Math.min(count, 5); // Mock streak for demo
        }

        return {
            totalCheckins: count || 0,
            streak: streak
        };
    },

    async getFamilyDetails(userId: string) {
        const { data, error } = await supabase
            .rpc('get_family_details', { _user_id: userId });

        if (error) throw error;
        return data;
    },

    async createFamilyInvite(userId: string) {
        const { data, error } = await supabase
            .rpc('create_family_invite', { _inviter_id: userId });

        if (error) throw error;
        return data; // Returns token
    },

    async acceptFamilyInvite(token: string, userId: string) {
        const { data, error } = await supabase
            .rpc('accept_family_invite', { _token: token, _user_id: userId });

        if (error) throw error;
        return data;
    },

    async removeFamilyMember(ownerId: string, memberId: string) {
        const { data, error } = await supabase
            .rpc('remove_family_member', { _owner_id: ownerId, _member_id: memberId });

        if (error) throw error;
        return data;
    },

    async getLevelProgress(userId: string) {
        const { data, error } = await supabase
            .rpc('get_user_level_progress', { p_user_id: userId });

        if (error) throw error;
        return data;
    }
};
