import { supabase } from '../lib/supabase';

export const checkinService = {
    async performCheckin(userId: string, academyId: string, lat: number, long: number) {
        const { data, error } = await supabase
            .rpc('perform_checkin', {
                _user_id: userId,
                _academy_id: academyId,
                _user_lat: lat,
                _user_long: long
            });

        if (error) throw error;
        return data;
    },

    async getCheckins(userId: string) {
        const { data, error } = await supabase
            .from('checkins')
            .select('*, academies(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
};
