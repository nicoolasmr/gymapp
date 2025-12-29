import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Mission {
    id: string;
    mission_type: string;
    title: string;
    description: string;
    target_value: number;
    current_value: number;
    status: 'pending' | 'completed' | 'expired' | 'claimed';
    reward_type: string;
    reward_value: any;
    expires_at: string;
    completed_at?: string;
}

const MISSION_ICONS: { [key: string]: string } = {
    train_3x: '🏋️',
    different_academies: '🗺️',
    beat_streak: '🔥',
    new_badge: '🏆',
};

export default function MissionsScreen() {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchMissions();
        generateMissionsIfNeeded();
    }, []);

    const generateMissionsIfNeeded = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.rpc('generate_weekly_missions', { p_user_id: user.id });
        } catch (error) {
            console.error('Error generating missions:', error);
        }
    };

    const fetchMissions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_missions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['pending', 'completed'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMissions(data || []);
        } catch (error) {
            console.error('Error fetching missions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMissions();
    };

    const handleClaimReward = async (mission: Mission) => {
        try {
            const { error } = await supabase
                .from('user_missions')
                .update({
                    status: 'claimed',
                    claimed_at: new Date().toISOString()
                })
                .eq('id', mission.id);

            if (error) throw error;

            // Process reward
            if (mission.reward_type === 'points') {
                const points = mission.reward_value?.points || 0;
                Alert.alert(
                    '🎉 Recompensa Recebida!',
                    `Você ganhou ${points} pontos premium!`,
                    [{ text: 'OK' }]
                );
            } else if (mission.reward_type === 'badge') {
                Alert.alert(
                    '🏆 Nova Badge!',
                    'Você desbloqueou uma badge especial!',
                    [
                        { text: 'Ver Badges', onPress: () => router.push('/profile/progress' as any) },
                        { text: 'OK' }
                    ]
                );
            } else if (mission.reward_type === 'premium_trial') {
                const days = mission.reward_value?.days || 7;
                Alert.alert(
                    '💎 Premium Grátis!',
                    `Você ganhou ${days} dias de Premium grátis!`,
                    [{ text: 'Ativar', onPress: () => router.push('/premium' as any) }]
                );
            }

            fetchMissions();
        } catch (error) {
            console.error('Error claiming reward:', error);
            Alert.alert('Erro', 'Não foi possível resgatar a recompensa');
        }
    };

    const getProgressPercentage = (mission: Mission) => {
        return Math.min((mission.current_value / mission.target_value) * 100, 100);
    };

    const getTimeRemaining = (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h`;
        return 'Expirando em breve';
    };

    const activeMissions = missions.filter(m => m.status === 'pending');
    const completedMissions = missions.filter(m => m.status === 'completed');

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando missões...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🎯 Missões Semanais</Text>
                <Text style={styles.headerSubtitle}>Complete desafios e ganhe recompensas!</Text>
            </View>

            {/* Active Missions */}
            {activeMissions.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Missões Ativas</Text>
                    {activeMissions.map((mission) => {
                        const progress = getProgressPercentage(mission);
                        const icon = MISSION_ICONS[mission.mission_type] || '🎯';

                        return (
                            <View key={mission.id} style={styles.missionCard}>
                                <View style={styles.missionHeader}>
                                    <Text style={styles.missionIcon}>{icon}</Text>
                                    <View style={styles.missionInfo}>
                                        <Text style={styles.missionTitle}>{mission.title}</Text>
                                        <Text style={styles.missionDescription}>{mission.description}</Text>
                                    </View>
                                </View>

                                {/* Progress Bar */}
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {mission.current_value}/{mission.target_value}
                                    </Text>
                                </View>

                                {/* Reward & Time */}
                                <View style={styles.missionFooter}>
                                    <View style={styles.rewardBadge}>
                                        <Ionicons name="gift" size={16} color="#059669" />
                                        <Text style={styles.rewardText}>
                                            {mission.reward_type === 'points' && `${mission.reward_value?.points} pts`}
                                            {mission.reward_type === 'badge' && 'Badge Especial'}
                                            {mission.reward_type === 'premium_trial' && `${mission.reward_value?.days}d Premium`}
                                        </Text>
                                    </View>
                                    <Text style={styles.timeRemaining}>
                                        ⏰ {getTimeRemaining(mission.expires_at)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Completed Missions */}
            {completedMissions.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Missões Completadas</Text>
                    {completedMissions.map((mission) => {
                        const icon = MISSION_ICONS[mission.mission_type] || '🎯';

                        return (
                            <View key={mission.id} style={[styles.missionCard, styles.completedCard]}>
                                <View style={styles.missionHeader}>
                                    <Text style={styles.missionIcon}>{icon}</Text>
                                    <View style={styles.missionInfo}>
                                        <Text style={styles.missionTitle}>{mission.title}</Text>
                                        <Text style={styles.completedText}>✓ Completada!</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.claimButton}
                                    onPress={() => handleClaimReward(mission)}
                                >
                                    <Ionicons name="gift" size={20} color="#FFFFFF" />
                                    <Text style={styles.claimButtonText}>Resgatar Recompensa</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Empty State */}
            {missions.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🎯</Text>
                    <Text style={styles.emptyTitle}>Nenhuma missão ativa</Text>
                    <Text style={styles.emptySubtitle}>
                        Novas missões serão geradas automaticamente toda semana!
                    </Text>
                </View>
            )}

            {/* Info Card */}
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>💡 Como funciona?</Text>
                <Text style={styles.infoText}>
                    • Missões são renovadas toda semana{'\n'}
                    • Complete desafios para ganhar recompensas{'\n'}
                    • Resgate suas recompensas antes que expirem{'\n'}
                    • Quanto mais você treina, melhores as recompensas!
                </Text>
            </View>
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
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    header: {
        marginBottom: 24,
        paddingTop: 40,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    missionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    completedCard: {
        backgroundColor: '#F0FDF4',
        borderColor: '#86EFAC',
    },
    missionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    missionIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    missionInfo: {
        flex: 1,
    },
    missionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    missionDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    completedText: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '600',
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'right',
    },
    missionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    rewardText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
        marginLeft: 4,
    },
    timeRemaining: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    claimButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    claimButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    infoCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E40AF',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#1E40AF',
        lineHeight: 22,
    },
});
