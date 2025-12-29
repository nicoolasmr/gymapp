import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../hooks/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

import { NextStepCard } from '../../components/NextStepCard';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS: Record<number, { description: string; cta: string; route: string }> = {
    1: { description: 'Faça seu primeiro check-in em uma academia parceira.', cta: 'Fazer Check-in', route: '/(tabs)/explore' }, // Or checkin tab? explore is better to find one
    2: { description: 'Complete seu perfil com uma foto e seus objetivos.', cta: 'Editar Perfil', route: '/(tabs)/profile' },
    3: { description: 'Entre em uma comunidade da sua modalidade favorita.', cta: 'Ver Comunidades', route: '/community' },
    4: { description: 'Conecte-se com amigos ou siga outros atletas.', cta: 'Buscar Amigos', route: '/feed' },
    5: { description: 'Participe de um desafio PVP ou aceite um convite.', cta: 'Ver Desafios', route: '/(tabs)/competitions' },
    6: { description: 'Treine em uma academia diferente ou nova modalidade.', cta: 'Explorar', route: '/(tabs)/explore' },
    7: { description: 'Veja seu resumo da semana e estatísticas.', cta: 'Ver Estatísticas', route: '/(tabs)/profile' },
};

const CATEGORIES = [
    { id: 'all', name: 'Todos', icon: 'grid-outline', modality: null },
    { id: 'crossfit', name: 'CrossFit', icon: 'barbell-outline', modality: 'crossfit_box' },
    { id: 'gym', name: 'Musculação', icon: 'fitness-outline', modality: 'gym_standard' },
    { id: 'studio', name: 'Studio', icon: 'body-outline', modality: 'studio' },
];

export default function HomeScreen() {
    const { user } = useAuthStore();
    const [membership, setMembership] = useState<any>(null);
    const [academies, setAcademies] = useState<any[]>([]);
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [onboardingState, setOnboardingState] = useState<any>(null);
    const router = useRouter();

    const [pendingCheckin, setPendingCheckin] = useState<any>(null);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Fetch onboarding state
            const { data: onboardingData, error: onboardingError } = await supabase
                .rpc('get_user_onboarding_state', { p_user_id: user.id });

            if (onboardingError) console.log('Onboarding fetch error:', onboardingError);
            if (onboardingData) setOnboardingState(onboardingData);

            // Fetch membership
            const { data: membershipData, error: membershipError } = await supabase
                .from('memberships')
                .select('*, modality_plans(plan_name)')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .limit(1);

            if (membershipError) console.log('Membership fetch error:', membershipError);
            setMembership(membershipData && membershipData.length > 0 ? membershipData[0] : null);

            // Fetch pending check-ins
            const { data: checkinData, error: checkinError } = await supabase
                .from('checkins')
                .select('*, academies(name)')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1);

            if (!checkinError && checkinData && checkinData.length > 0) {
                setPendingCheckin(checkinData[0]);
            } else {
                setPendingCheckin(null);
            }

            // Fetch user progress
            const { data: progressData, error: progressError } = await supabase
                .rpc('get_user_progress', { p_user_id: user.id });

            if (progressError) console.log('Progress fetch error:', progressError);
            if (progressData) setProgress(progressData);

            // Fetch academies
            let query = supabase.from('academies').select('*').limit(10);
            const selectedCategory = CATEGORIES.find(c => c.id === activeCategory);
            if (selectedCategory?.modality) {
                query = query.eq('modality', selectedCategory.modality);
            }
            const { data: academiesData } = await query;
            setAcademies(academiesData || []);

        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, activeCategory]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#111827" />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.profileHeader}
                        onPress={async () => {
                            const { data } = await supabase
                                .from('user_profiles_public')
                                .select('username')
                                .eq('user_id', user?.id)
                                .single();
                            if (data?.username) {
                                router.push(`/u/${data.username}`);
                            }
                        }}
                    >
                        <Image
                            source={{ uri: user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.full_name || 'User'}&background=random` }}
                            style={styles.avatar}
                        />
                        <View>
                            <Text style={styles.greeting}>Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Atleta'}</Text>
                            <Text style={styles.subtitle}>Vamos treinar?</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => router.push('/feed')}
                        >
                            <Ionicons name="people-outline" size={24} color="#111827" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.qrButton}
                            onPress={() => router.push('/checkin')}
                        >
                            <Ionicons name="qr-code" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Onboarding Next Step Card */}
                {onboardingState && (
                    <NextStepCard
                        day={onboardingState.current_day}
                        completed={onboardingState.completed}
                        description={ONBOARDING_STEPS[onboardingState.current_day]?.description || 'Jornada concluída!'}
                        ctaLabel={ONBOARDING_STEPS[onboardingState.current_day]?.cta || 'Ver'}
                        onPress={() => {
                            if (onboardingState.completed) {
                                router.push('/(tabs)/competitions'); // Or missions if we had them
                            } else {
                                const route = ONBOARDING_STEPS[onboardingState.current_day]?.route;
                                if (route) router.push(route as any);
                            }
                        }}
                    />
                )}

                {/* Pending Check-in Card (High Priority) */}
                {pendingCheckin && (
                    <TouchableOpacity
                        style={styles.pendingCheckinCard}
                        onPress={() => router.push({
                            pathname: '/checkin',
                            params: {
                                checkinId: pendingCheckin.id,
                                checkinAcademyName: pendingCheckin.academies?.name,
                                status: 'pending'
                            }
                        } as any)}
                    >
                        <View style={styles.pendingCheckinContent}>
                            <View style={styles.pendingIconContainer}>
                                <Ionicons name="time" size={24} color="#fff" />
                            </View>
                            <View style={styles.pendingTextContainer}>
                                <Text style={styles.pendingTitle}>Check-in Agendado</Text>
                                <Text style={styles.pendingSubtitle}>{pendingCheckin.academies?.name}</Text>
                                <Text style={styles.pendingAction}>Toque para validar →</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Streak Card - MOVED TO PROFILE */}

                {/* Membership Status */}
                <View style={styles.section}>
                    {membership ? (
                        <View style={styles.activePlanCard}>
                            <View>
                                <Text style={styles.planLabel}>SEU PLANO</Text>
                                <Text style={styles.planName}>{membership.modality_plans?.plan_name}</Text>
                                <Text style={styles.planExpiry}>Renova em {new Date(membership.renewal_date).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.activeBadge}>
                                <Text style={styles.activeText}>ATIVO</Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.promoCard}
                            onPress={() => router.push('/modal/subscribe')}
                        >
                            <View>
                                <Text style={styles.promoTitle}>Comece agora</Text>
                                <Text style={styles.promoText}>Assine e treine onde quiser</Text>
                            </View>
                            <View style={styles.promoButton}>
                                <Text style={styles.promoButtonText}>Ver Planos</Text>
                                <Ionicons name="arrow-forward" size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Categories */}
                <View style={styles.categoriesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
                                onPress={() => setActiveCategory(cat.id)}
                            >
                                <Ionicons
                                    name={cat.icon as any}
                                    size={18}
                                    color={activeCategory === cat.id ? '#fff' : '#6b7280'}
                                />
                                <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Featured Academies */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Academias Perto de Você</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                            <Text style={styles.seeAll}>Ver todas</Text>
                        </TouchableOpacity>
                    </View>

                    {academies.map((academy) => (
                        <TouchableOpacity
                            key={academy.id}
                            style={styles.academyCard}
                            onPress={() => router.push(`/academy/${academy.id}` as any)}
                        >
                            <Image
                                source={{ uri: academy.logo_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }}
                                style={styles.academyImage}
                            />
                            <View style={styles.academyInfo}>
                                <View style={styles.academyHeader}>
                                    <Text style={styles.academyName}>{academy.name}</Text>
                                    <View style={styles.ratingContainer}>
                                        <Ionicons name="star" size={14} color="#f59e0b" />
                                        <Text style={styles.ratingText}>4.8</Text>
                                    </View>
                                </View>
                                <Text style={styles.academyAddress} numberOfLines={1}>{academy.address}</Text>
                                <View style={styles.tagsContainer}>
                                    <View style={styles.tag}>
                                        <Text style={styles.tagText}>
                                            {academy.modality === 'gym_standard' ? 'Musculação' :
                                                academy.modality === 'crossfit_box' ? 'CrossFit' : 'Studio'}
                                        </Text>
                                    </View>
                                    <View style={styles.tag}>
                                        <Text style={styles.tagText}>Ar Condicionado</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrButton: {
        width: 48,
        height: 48,
        backgroundColor: '#111827',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    pendingCheckinCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#f59e0b',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    pendingCheckinContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    pendingIconContainer: {
        width: 48,
        height: 48,
        backgroundColor: '#f59e0b',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingTextContainer: {
        flex: 1,
    },
    pendingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#92400e',
        marginBottom: 2,
    },
    pendingSubtitle: {
        fontSize: 14,
        color: '#b45309',
        fontWeight: '500',
        marginBottom: 4,
    },
    pendingAction: {
        fontSize: 14,
        color: '#d97706',
        fontWeight: 'bold',
    },
    streakCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#fef3c7',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    streakCardBroken: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#dbeafe',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    streakContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    streakIcon: {
        fontSize: 36,
    },
    streakText: {
        flex: 1,
    },
    streakNumber: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    streakSubtext: {
        fontSize: 14,
        color: '#b45309',
        fontWeight: '500',
    },
    streakNumberBroken: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    streakSubtextBroken: {
        fontSize: 14,
        color: '#2563eb',
        fontWeight: '500',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    activePlanCard: {
        backgroundColor: '#111827',
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    planLabel: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    planName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    planExpiry: {
        color: '#d1d5db',
        fontSize: 12,
    },
    activeBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    activeText: {
        color: '#34d399',
        fontSize: 10,
        fontWeight: 'bold',
    },
    promoCard: {
        backgroundColor: '#2563eb',
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    promoTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    promoText: {
        color: '#bfdbfe',
        fontSize: 14,
    },
    promoButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    promoButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    categoriesContainer: {
        marginBottom: 24,
    },
    categoriesContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    categoryChipActive: {
        backgroundColor: '#111827',
        borderColor: '#111827',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    categoryTextActive: {
        color: '#fff',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    seeAll: {
        fontSize: 14,
        color: '#2563eb',
        fontWeight: '600',
    },
    academyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    academyImage: {
        width: '100%',
        height: 160,
    },
    academyInfo: {
        padding: 16,
    },
    academyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    academyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fffbeb',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#b45309',
    },
    academyAddress: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    tag: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: '500',
    },
});
