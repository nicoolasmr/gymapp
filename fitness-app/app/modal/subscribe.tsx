import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../hooks/useAuthStore';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

export default function SubscribeScreen() {
    const { user, session } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Gym Panel API URL - Replace with your actual local IP or deployed URL
    const API_URL = 'http://localhost:3000/api/checkout';

    const plans = [
        { id: 'solo', name: 'Plano Solo', price: 'R$ 99,00', description: 'Acesso ilimitado para você.' },
        { id: 'family', name: 'Plano Família', price: 'R$ 499,00', description: 'Para você e mais 3 pessoas.' },
    ];

    const handleSubscribe = async (planId: string) => {
        if (!user) return;
        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    priceId: planId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao iniciar pagamento');
            }

            if (data.url) {
                // Open Stripe Checkout in browser
                await Linking.openURL(data.url);
                // In a real app, we would listen for deep link return to confirm
                // For now, we can just go back or show a "Check status" button
                router.back();
            }

        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.title}>Escolha seu Plano</Text>
            <Text style={styles.subtitle}>Liberdade para treinar onde quiser.</Text>

            {plans.map((plan) => (
                <View key={plan.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planPrice}>{plan.price}<Text style={styles.period}>/mês</Text></Text>
                    </View>
                    <Text style={styles.description}>{plan.description}</Text>

                    <View style={styles.features}>
                        <View style={styles.featureRow}>
                            <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                            <Text style={styles.featureText}>Acesso a todas as academias</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                            <Text style={styles.featureText}>Sem taxa de cancelamento</Text>
                        </View>
                    </View>

                    <Button
                        title={`Assinar ${plan.name}`}
                        onPress={() => handleSubscribe(plan.id)}
                        loading={loading}
                        style={{ marginTop: 16 }}
                    />
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
        padding: 24,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 8,
        marginTop: 20, // Add top margin (safe area)
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 32,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        marginBottom: 12,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    planPrice: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563eb',
        marginTop: 4,
    },
    period: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: 'normal',
    },
    description: {
        fontSize: 16,
        color: '#4b5563',
        marginBottom: 24,
    },
    features: {
        marginBottom: 8,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        marginLeft: 8,
        color: '#4b5563',
        fontSize: 14,
    },
});
