import { supabase } from '../lib/supabase';

export interface StudioClass {
    id: string;
    name: string;
    instructor: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    capacity: number;
    academy_id: string;
}

export interface Reservation {
    id: string;
    class_id: string;
    date: string;
    status: 'reserved' | 'checked_in' | 'cancelled' | 'noshow';
    class_details?: StudioClass;
}

export const reservationService = {
    // Buscar aulas de um estúdio
    async getStudioClasses(academyId: string) {
        const { data, error } = await supabase
            .from('studio_classes')
            .select('*')
            .eq('academy_id', academyId)
            .order('day_of_week')
            .order('start_time');

        if (error) throw error;
        return data as StudioClass[];
    },

    // Fazer reserva
    async makeReservation(userId: string, classId: string, date: string) {
        const { data, error } = await supabase.rpc('make_reservation', {
            _user_id: userId,
            _class_id: classId,
            _date: date
        });

        if (error) throw error;
        return data;
    },

    // Buscar minhas reservas
    async getMyReservations(userId: string) {
        const { data, error } = await supabase
            .from('reservations')
            .select('*, class_details:studio_classes(*)')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data;
    }
};
