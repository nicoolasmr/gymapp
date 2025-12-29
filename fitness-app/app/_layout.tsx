import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { useAuthStore } from '../hooks/useAuthStore';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator, Platform } from 'react-native';

import { notificationService } from '../services/notificationService';

export default function RootLayout() {
    const { session, loading, setSession, checkSession, pendingInviteToken, setPendingInviteToken } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const params = useGlobalSearchParams();

    useEffect(() => {
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user && Platform.OS !== 'web') {
                notificationService.registerForPushNotificationsAsync(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const isInvite = segments[0] === 'invite';

        if (!session) {
            if (isInvite && params.token) {
                // Store token and redirect to login
                setPendingInviteToken(params.token as string);
                router.replace('/(auth)/login');
            } else if (!inAuthGroup) {
                // Redirect to login if not authenticated and not already there
                router.replace('/(auth)/login');
            }
        } else if (session && inAuthGroup) {
            // Redirect to home or pending invite if authenticated
            if (pendingInviteToken) {
                router.replace(`/invite?token=${pendingInviteToken}`);
            } else {
                router.replace('/(tabs)/home');
            }
        }
    }, [session, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
