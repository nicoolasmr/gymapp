import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface NextStepProps {
    day: number;
    description: string;
    ctaLabel: string;
    onPress: () => void;
    completed?: boolean;
}

export function NextStepCard({ day, description, ctaLabel, onPress, completed }: NextStepProps) {
    if (completed) {
        return (
            <TouchableOpacity onPress={onPress}>
                <LinearGradient
                    colors={['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    <View style={styles.content}>
                        <View style={styles.iconContainerSuccess}>
                            <Ionicons name="trophy" size={24} color="#fff" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.headerTitle}>Jornada Completada!</Text>
                            <Text style={styles.description}>Você completou seus 7 dias iniciais.</Text>
                            <Text style={styles.cta}>Ver Próximos Desafios →</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity onPress={onPress}>
            <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.header}>
                    <Text style={styles.dayLabel}>DIA {day} DE 7</Text>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${(day / 7) * 100}%` }]} />
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="flag" size={24} color="#2563eb" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Seu Próximo Passo</Text>
                        <Text style={styles.description}>{description}</Text>
                        <Text style={styles.cta}>{ctaLabel} →</Text>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
            web: {
                // @ts-ignore
                boxShadow: '0px 8px 16px rgba(37, 99, 235, 0.25)',
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dayLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    progressContainer: {
        width: 60,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerSuccess: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        color: '#bfdbfe', // Light blueish white
        fontSize: 14,
        marginBottom: 8,
        lineHeight: 20,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cta: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
