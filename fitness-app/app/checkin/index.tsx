import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../hooks/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function CheckInScreen() {
    const { academyId, academyName, status, checkinId: paramCheckinId, checkinAcademyName } = useLocalSearchParams();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'idle' | 'pending' | 'success'>('idle');
    const [checkinId, setCheckinId] = useState<string | null>(null);
    const [checkinData, setCheckinData] = useState<any>(null);
    const [displayAcademyName, setDisplayAcademyName] = useState<string>(academyName as string || checkinAcademyName as string || '');
    const router = useRouter();

    useEffect(() => {
        // If coming from Home with a specific checkinId/status
        if (paramCheckinId && status === 'pending') {
            setCheckinId(paramCheckinId as string);
            setStep('pending');
            if (checkinAcademyName) setDisplayAcademyName(checkinAcademyName as string);
        }
        // If just navigating to /checkin but we might have a pending one (safety check)
        else if (user) {
            checkPendingCheckin();
        }
    }, [paramCheckinId, status, user]);

    const checkPendingCheckin = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('checkins')
            .select('*, academies(name)')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (data) {
            setCheckinId(data.id);
            setDisplayAcademyName(data.academies?.name || '');
            setStep('pending');
        }
    };

    // Step 1: Reserve the spot (Schedule Check-in) - Remote allowed
    const handleReserve = async () => {
        if (!user || !academyId) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('checkins')
                .insert({
                    user_id: user.id,
                    academy_id: academyId,
                    status: 'pending' // New status
                })
                .select()
                .single();

            if (error) throw error;

            setCheckinId(data.id);
            setStep('pending');
            Alert.alert('Reserva Realizada', 'Vá até a academia para validar seu acesso.');

        } catch (error: any) {
            Alert.alert('Erro ao Reservar', error.message || 'Falha ao agendar check-in');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Validate Location - Must be near academy
    const handleValidate = async () => {
        console.log('Validating checkin...', { checkinId, userId: user?.id });
        if (!checkinId || !user) return;
        setLoading(true);

        try {
            // Get Location
            let { status } = await Location.requestForegroundPermissionsAsync();
            console.log('Permission status:', status);
            if (status !== 'granted') {
                Alert.alert('Permissão negada', 'Precisamos da sua localização para validar o check-in.');
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            console.log('User location:', location.coords);
            const { latitude, longitude } = location.coords;

            // Call Validation RPC
            console.log('Calling RPC validate_checkin...');
            const { data, error } = await supabase
                .rpc('validate_checkin', {
                    p_checkin_id: checkinId,
                    p_user_id: user.id,
                    p_lat: latitude,
                    p_long: longitude
                });

            console.log('RPC Response:', { data, error });

            if (error) throw error;

            if (data.success) {
                // Navigate to the Result Screen - Success
                router.replace({
                    pathname: '/checkin/result',
                    params: { success: 'true' }
                });
            } else {
                console.log('Validation failed:', data);
                // Navigate to the Result Screen - Failure
                const failMessage = data.message === 'Too far from academy'
                    ? 'Você precisa estar mais perto da Academia para validar o seu checkin'
                    : 'Não foi possível validar sua localização.';

                router.replace({
                    pathname: '/checkin/result',
                    params: { success: 'false', message: failMessage }
                });
            }

        } catch (error: any) {
            console.error('Validation Error:', error);
            Alert.alert('Erro na Validação', error.message || 'Falha técnica ao validar.');
        } finally {
            setLoading(false);
        }
    };



    if (step === 'pending') {
        return (
            <View style={styles.containerPending}>
                <View style={styles.pendingCard}>
                    <Ionicons name="time" size={64} color="#f59e0b" />
                    <Text style={styles.pendingTitle}>Check-in Agendado</Text>
                    <Text style={styles.pendingSubtitle}>Valide sua presença na academia</Text>

                    <View style={styles.instructionBox}>
                        <Text style={styles.instructionText}>
                            Ao chegar na recepção da <Text style={{ fontWeight: 'bold' }}>{displayAcademyName}</Text>, clique no botão abaixo para confirmar sua localização.
                        </Text>
                    </View>

                    <Button
                        title="📍 Validar Check-in Agora"
                        onPress={handleValidate}
                        loading={loading}
                        style={styles.validateButton}
                        textStyle={{ fontSize: 16, fontWeight: 'bold' }}
                    />
                    <Button
                        title="Voltar ao Início"
                        onPress={() => router.push('/(tabs)/home')}
                        style={styles.homeButton}
                        textStyle={{ color: '#6b7280', fontSize: 16 }}
                    />
                </View>
            </View>
        );
    }

    // Step 0: Idle State (Reserve)
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Novo Agendamento</Text>
            <Text style={styles.subtitle}>{academyName}</Text>

            <View style={styles.instructionContainer}>
                <Ionicons name="calendar-outline" size={48} color="#ffffff" />
                <Text style={styles.instruction}>
                    Você pode reservar sua aula de onde estiver. O check-in só será confirmado quando você chegar na academia.
                </Text>
            </View>

            <Button
                title="📅 Reservar Check-in"
                onPress={handleReserve}
                loading={loading}
                style={styles.checkinButton}
                textStyle={{ fontSize: 18, fontWeight: 'bold', color: '#2563eb' }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 20,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 48,
    },
    instructionContainer: {
        alignItems: 'center',
        marginBottom: 48,
        paddingHorizontal: 24,
    },
    instruction: {
        color: '#ffffff',
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.9,
        lineHeight: 24,
    },
    checkinButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#ffffff',
    },
    successCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 16,
    },
    successSubtitle: {
        fontSize: 18,
        color: '#6b7280',
        marginTop: 4,
    },
    timestamp: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563eb',
        marginTop: 16,
        marginBottom: 24,
    },
    qrContainer: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        width: '100%',
    },
    qrLabel: {
        marginTop: 12,
        color: '#6b7280',
        fontSize: 14,
    },
    containerPending: {
        flex: 1,
        backgroundColor: '#f9fafb',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    pendingCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    pendingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 16,
    },
    pendingSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    instructionBox: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        marginBottom: 24,
        width: '100%',
    },
    instructionText: {
        color: '#1e40af',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    validateButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#2563eb',
        marginBottom: 12,
    },
    homeButton: {
        width: '100%',
        height: 48,
        backgroundColor: 'transparent',
        marginTop: 8,
    }
});
