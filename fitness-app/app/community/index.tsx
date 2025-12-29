import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COMMUNITIES = [
    {
        id: 'crossfit_box',
        name: 'CrossFit',
        description: 'WODs, superação e comunidade forte. Junte-se aos crossfiteiros!',
        icon: 'barbell',
        color: '#F97316', // Orange
        image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 'gym_standard',
        name: 'Musculação',
        description: 'Foco, hipertrofia e disciplina. Compartilhe seus treinos.',
        icon: 'fitness',
        color: '#EF4444', // Red
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 'studio',
        name: 'Studios & Yoga',
        description: 'Equilíbrio, flexibilidade e bem-estar. Conecte-se.',
        icon: 'body',
        color: '#8B5CF6', // Purple
        image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    }
];

export default function CommunitiesListScreen() {
    const router = useRouter();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/home');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Comunidades</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <Text style={styles.heroTitle}>Encontre sua tribo 👥</Text>
                    <Text style={styles.heroSubtitle}>
                        Participe de grupos, compartilhe conquistas e motive outros atletas da sua modalidade.
                    </Text>
                </View>

                <View style={styles.grid}>
                    {COMMUNITIES.map((community) => (
                        <TouchableOpacity
                            key={community.id}
                            style={styles.card}
                            onPress={() => router.push(`/community/${community.id}`)}
                        >
                            <Image source={{ uri: community.image }} style={styles.cardImage} />
                            <View style={styles.cardOverlay} />
                            <View style={styles.cardContent}>
                                <View style={[styles.iconContainer, { backgroundColor: community.color }]}>
                                    <Ionicons name={community.icon as any} size={24} color="#FFFFFF" />
                                </View>
                                <Text style={styles.cardTitle}>{community.name}</Text>
                                <Text style={styles.cardDescription}>{community.description}</Text>
                                <View style={styles.enterButton}>
                                    <Text style={styles.enterText}>Entrar</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Feed Geral Link */}
                <TouchableOpacity
                    style={styles.feedCard}
                    onPress={() => router.push('/feed')}
                >
                    <View style={styles.feedIcon}>
                        <Ionicons name="newspaper-outline" size={32} color="#2563eb" />
                    </View>
                    <View style={styles.feedContent}>
                        <Text style={styles.feedTitle}>Feed Social Geral</Text>
                        <Text style={styles.feedSubtitle}>Veja o que seus amigos de todas as modalidades estão fazendo.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    hero: {
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
    },
    grid: {
        gap: 16,
        marginBottom: 32,
    },
    card: {
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#111827',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardImage: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.7,
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    cardContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-end',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        position: 'absolute',
        top: 20,
        left: 20,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 16,
    },
    enterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    enterText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    feedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    feedIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedContent: {
        flex: 1,
    },
    feedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    feedSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
});
