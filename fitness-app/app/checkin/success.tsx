import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CheckinSuccessScreen() {
    const router = useRouter();
    const scaleValue = new Animated.Value(0);
    const fadeValue = new Animated.Value(0);

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scaleValue, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
            Animated.timing(fadeValue, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleValue }] }]}>
                    <View style={styles.circle}>
                        <Ionicons name="checkmark" size={80} color="#ffffff" />
                    </View>
                </Animated.View>

                <Animated.View style={{ opacity: fadeValue, alignItems: 'center' }}>
                    <Text style={styles.title}>Treino Confirmado!</Text>
                    <Text style={styles.subtitle}>Você está um passo mais perto do seu objetivo.</Text>

                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>SEQUÊNCIA</Text>
                            <Text style={styles.statValue}>🔥 3 Dias</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>TOTAL</Text>
                            <Text style={styles.statValue}>💪 12 Treinos</Text>
                        </View>
                    </View>
                </Animated.View>
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/(tabs)/home')}
            >
                <Text style={styles.buttonText}>Voltar ao Início</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2563eb',
        justifyContent: 'space-between',
        padding: 24,
        paddingTop: 100,
        paddingBottom: 40,
    },
    content: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 40,
    },
    circle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        padding: 20,
        width: '100%',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statValue: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#ffffff',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#2563eb',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
