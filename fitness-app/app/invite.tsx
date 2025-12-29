import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../hooks/useAuthStore';
import { userService } from '../services/userService';
import { Ionicons } from '@expo/vector-icons';

export default function InviteScreen() {
    const { token } = useLocalSearchParams();
    const { user, setPendingInviteToken } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Clear pending token since we are here
        setPendingInviteToken(null);
    }, []);

    const handleAccept = async () => {
        if (!user || !token) return;

        setLoading(true);
        try {
            await userService.acceptFamilyInvite(token as string, user.id);
            setStatus('success');
            setMessage('Convite aceito com sucesso! Você agora faz parte do plano família.');
        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'Não foi possível aceitar o convite.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoHome = () => {
        router.replace('/(tabs)/home');
    };

    if (!user) {
        // Should not happen due to _layout redirect, but just in case
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text>Redirecionando para login...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={status === 'success' ? 'checkmark-circle' : status === 'error' ? 'alert-circle' : 'people'}
                        size={64}
                        color={status === 'success' ? '#16a34a' : status === 'error' ? '#dc2626' : '#2563eb'}
                    />
                </View>

                <Text style={styles.title}>
                    {status === 'success' ? 'Bem-vindo à Família!' :
                        status === 'error' ? 'Ops!' :
                            'Convite para Plano Família'}
                </Text>

                <Text style={styles.description}>
                    {status === 'success' ? message :
                        status === 'error' ? message :
                            'Você foi convidado para fazer parte de um Plano Família. Aceite para aproveitar todos os benefícios!'}
                </Text>

                {status === 'idle' && (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleAccept}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Aceitar Convite</Text>
                        )}
                    </TouchableOpacity>
                )}

                {(status === 'success' || status === 'error') && (
                    <TouchableOpacity style={styles.outlineButton} onPress={handleGoHome}>
                        <Text style={styles.outlineButtonText}>Ir para Home</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    outlineButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    outlineButtonText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 16,
    },
});
