import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { UserEngagement, getAllBadgesWithStatus } from '@/utils/badgeRules';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
    const [progress, setProgress] = useState<UserEngagement | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProgress();
    }, []);

    const fetchProgress = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .rpc('get_user_progress', { p_user_id: user.id })
                .single();

            if (!error && data) {
                setProgress(data);
            }
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Carregando...</Text>
            </View>
        );
    }

    if (!progress) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Erro ao carregar progresso</Text>
            </View>
        );
    }

    const badges = getAllBadgesWithStatus(progress);
    const unlockedBadges = badges.filter(b => b.unlocked);
    const lockedBadges = badges.filter(b => !b.unlocked);

    const maxCount = Math.max(...(progress.checkins_last_7_days?.map((d: any) => d.count) || [1]), 1);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Meu Progresso</Text>
                <Text style={styles.subtitle}>Acompanhe sua jornada fitness</Text>
            </View>

            {/* Streak Card */}
            <View style={styles.streakCard}>
                <View style={styles.streakMain}>
                    <Text style={styles.streakIcon}>🔥</Text>
                    <View style={styles.streakInfo}>
                        <Text style={styles.streakNumber}>{progress.current_streak}</Text>
                        <Text style={styles.streakLabel}>dias seguidos</Text>
                    </View>
                </View>
                <Text style={styles.streakMessage}>
                    {progress.current_streak > 0
                        ? `Você está no dia ${progress.current_streak} da sua sequência!`
                        : 'Comece sua sequência hoje!'}
                </Text>
                <View style={styles.recordBadge}>
                    <Ionicons name="trophy" size={16} color="#F59E0B" />
                    <Text style={styles.recordText}>Seu recorde é {progress.longest_streak} dias!</Text>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{progress.total_checkins}</Text>
                    <Text style={styles.statLabel}>Check-ins Totais</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{unlockedBadges.length}</Text>
                    <Text style={styles.statLabel}>Conquistas</Text>
                </View>
            </View>

            {/* Weekly Chart */}
            <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>📊 Últimos 7 Dias</Text>
                <View style={styles.chart}>
                    {progress.checkins_last_7_days?.map((day: any, index: number) => {
                        const barHeight = (day.count / maxCount) * 100;
                        const date = new Date(day.date);
                        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });

                        return (
                            <View key={index} style={styles.chartBar}>
                                <View style={styles.barContainer}>
                                    <View
                                        style={[
                                            styles.bar,
                                            { height: `${barHeight}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.barLabel}>{dayName}</Text>
                                <Text style={styles.barCount}>{day.count}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Unlocked Badges */}
            {unlockedBadges.length > 0 && (
                <View style={styles.badgesSection}>
                    <Text style={styles.sectionTitle}>🏆 Conquistas Desbloqueadas</Text>
                    <View style={styles.badgesGrid}>
                        {unlockedBadges.map((badge) => (
                            <View key={badge.id} style={styles.badgeCard}>
                                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                                <Text style={styles.badgeName}>{badge.name}</Text>
                                <Text style={styles.badgeDesc}>{badge.description}</Text>
                                {badge.unlocked_at && (
                                    <Text style={styles.badgeDate}>
                                        {new Date(badge.unlocked_at).toLocaleDateString('pt-BR')}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
                <View style={styles.badgesSection}>
                    <Text style={styles.sectionTitle}>🔒 Próximas Conquistas</Text>
                    <View style={styles.badgesGrid}>
                        {lockedBadges.map((badge) => (
                            <View key={badge.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                                <Text style={styles.badgeIconLocked}>{badge.icon}</Text>
                                <Text style={styles.badgeNameLocked}>{badge.name}</Text>
                                <Text style={styles.badgeDescLocked}>{badge.description}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 100,
        fontSize: 16,
        color: '#6B7280',
    },
    errorText: {
        textAlign: 'center',
        marginTop: 100,
        fontSize: 16,
        color: '#EF4444',
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    streakCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    streakMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    streakIcon: {
        fontSize: 64,
        marginRight: 16,
    },
    streakInfo: {
        flex: 1,
    },
    streakNumber: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#F59E0B',
    },
    streakLabel: {
        fontSize: 16,
        color: '#6B7280',
    },
    streakMessage: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 12,
    },
    recordBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    recordText: {
        fontSize: 14,
        color: '#92400E',
        marginLeft: 6,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563EB',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    chart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
    },
    chartBar: {
        flex: 1,
        alignItems: 'center',
    },
    barContainer: {
        flex: 1,
        width: '80%',
        justifyContent: 'flex-end',
    },
    bar: {
        backgroundColor: '#2563EB',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
        textTransform: 'capitalize',
    },
    barCount: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 2,
    },
    badgesSection: {
        marginBottom: 24,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    badgeCard: {
        width: (width - 52) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    badgeCardLocked: {
        backgroundColor: '#F3F4F6',
        opacity: 0.7,
    },
    badgeIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    badgeIconLocked: {
        fontSize: 40,
        marginBottom: 8,
        opacity: 0.3,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeNameLocked: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeDesc: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    badgeDescLocked: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    badgeDate: {
        fontSize: 10,
        color: '#2563EB',
        marginTop: 4,
    },
});
