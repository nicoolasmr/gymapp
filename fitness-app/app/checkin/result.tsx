import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CheckinResultScreen() {
    const { success, message } = useLocalSearchParams();
    const router = useRouter();
    const isSuccess = success === 'true';
    const scaleValue = new Animated.Value(0);

    useEffect(() => {
        Animated.spring(scaleValue, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: isSuccess ? '#22c55e' : '#ef4444' }]}>
            <View style={styles.content}>
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleValue }] }]}>
                    <View style={styles.circle}>
                        <Ionicons
                            name={isSuccess ? "checkmark" : "close"}
                            size={80}
                            color={isSuccess ? "#22c55e" : "#ef4444"}
                        />
                    </View>
                </Animated.View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {isSuccess ? 'Sucesso!' : 'Atenção!'}
                    </Text>
                    <Text style={styles.message}>
                        {isSuccess
                            ? 'O seu check-in foi validado!'
                            : (message || 'Você precisa estar mais perto da Academia para validar o seu checkin')}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.replace('/(tabs)/home')}
                >
                    <Text style={[styles.buttonText, { color: isSuccess ? '#22c55e' : '#ef4444' }]}>
                        Voltar ao Menu
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 32,
    },
    circle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    textContainer: {
        marginBottom: 48,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 16,
    },
    message: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 26,
    },
    button: {
        backgroundColor: '#ffffff',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
        maxWidth: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});
