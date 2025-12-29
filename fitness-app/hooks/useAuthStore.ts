import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
    session: Session | null;
    user: User | null;
    loading: boolean;
    setSession: (session: Session | null) => void;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
    pendingInviteToken: string | null;
    setPendingInviteToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    loading: true,
    setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },
    checkSession: async () => {
        try {
            set({ loading: true });
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            set({ session: data.session, user: data.session?.user ?? null, loading: false });
        } catch (error) {
            console.error('Session check failed:', error);
            set({ session: null, user: null, loading: false });
        }
    },
    pendingInviteToken: null,
    setPendingInviteToken: (token: string | null) => set({ pendingInviteToken: token }),
}));
