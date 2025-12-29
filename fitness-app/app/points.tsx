import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface PointsData {
    total_points: number;
    lifetime_points: number;
}

interface Reward {
    id: string;
    name: string;
    description: string;
    points_cost: number;
    icon: string;
    category: string;
}

const AVAILABLE_REWARDS: Reward[] = [
    {
        id: '1',
        name: '7 Dias Premium Grátis',
        description: 'Experimente todos os recursos premium',
        points_cost: 500,
        icon: '💎',
        category: 'premium'
    },
    {
        id: '2',
        name: 'Badge Exclusiva "Colecionador"',
        description: 'Badge especial para seu perfil',
        points_cost: 300,
        icon: '🏆',
        category: 'badge'
    },
    {
        id: '3',
        name: 'Cupom 20% OFF Suplementos',
        description: 'Desconto em lojas parceiras',
        points_cost: 400,
        icon: '💊',
        category: 'discount'
    },
    {
        id: '4',
        name: 'Consultoria Nutricional',
        description: '1 sessão grátis com nutricionista',
        points_cost: 800,
        icon: '🥗',
        category: 'service'
    },
    {
        id: '5',
        name: 'Kit Fitness Exclusivo',
        description: 'Garrafinha + toalha + squeeze',
        points_cost: 1000,
        icon: '🎁',
        category: 'physical'
    },
    {
        id: '6',
        name: 'Acesso VIP Evento',
        description: 'Entrada para próximo workshop',
        points_cost: 600,
        icon: '🎫',
        category: 'event'
    }
];

export default function PointsScreen() {
    const [pointsData, setPointsData] = useState<PointsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchPoints();
    }, []);

    const fetchPoints = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_premium_points')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Create if doesn't exist
                const { data: newData } = await supabase
                    .from('user_premium_points')
                    .insert({ user_id: user.id })
                    .select()
                    .single();
                setPointsData(newData);
            } else if (data) {
                setPointsData(data);
            }
        } catch (error) {
            console.error('Error fetching points:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPoints();
    };

    const handleRedeem = (reward: Reward) => {
        // Implementar lógica de resgate
        alert(`Resgatar: ${reward.name} por ${reward.points_cost} pontos`);
    };

    const canAfford = (cost: number) => {
        return (pointsData?.total_points || 0) >= cost;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando pontos...</Text>
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
                <Text style={styles.headerTitle}>⭐ Pontos Premium</Text>
                <Text style={styles.headerSubtitle}>Troque seus pontos por recompensas incríveis!</Text>
            </View>

            {/* Points Balance */}
            <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                    <Text style={styles.balanceLabel}>Seus Pontos</Text>
                    <Ionicons name="star" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.balanceAmount}>{pointsData?.total_points || 0}</Text>
                <Text style={styles.balanceLifetime}>
                    Total acumulado: {pointsData?.lifetime_points || 0} pontos
                </Text>
            </View>

            {/* How to Earn */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Como Ganhar Pontos</Text>
                <View style={styles.earnCard}>
                    <View style={styles.earnItem}>
                        <Text style={styles.earnIcon}>🏋️</Text>
                        <View style={styles.earnContent}>
                            <Text style={styles.earnTitle}>Check-in Diário</Text>
                            <Text style={styles.earnPoints}>+10 pontos</Text>
                        </View>
                    </View>
                    <View style={styles.earnItem}>
                        <Text style={styles.earnIcon}>🔥</Text>
                        <View style={styles.earnContent}>
                            <Text style={styles.earnTitle}>Manter Streak</Text>
                            <Text style={styles.earnPoints}>+50 pontos/semana</Text>
                        </View>
                    </View>
                    <View style={styles.earnItem}>
                        <Text style={styles.earnIcon}>🎯</Text>
                        <View style={styles.earnContent}>
                            <Text style={styles.earnTitle}>Completar Missões</Text>
                            <Text style={styles.earnPoints}>+100 pontos</Text>
                        </View>
                    </View>
                    <View style={styles.earnItem}>
                        <Text style={styles.earnIcon}>🏆</Text>
                        <View style={styles.earnContent}>
                            <Text style={styles.earnTitle}>Desbloquear Badges</Text>
                            <Text style={styles.earnPoints}>+200 pontos</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Rewards */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recompensas Disponíveis</Text>
                <View style={styles.rewardsGrid}>
                    {AVAILABLE_REWARDS.map((reward) => {
                        const affordable = canAfford(reward.points_cost);
                        return (
                            <TouchableOpacity
                                key={reward.id}
                                style={[
                                    styles.rewardCard,
                                    !affordable && styles.rewardCardDisabled
                                ]}
                                onPress={() => affordable && handleRedeem(reward)}
                                disabled={!affordable}
                            >
                                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                                <Text style={styles.rewardName}>{reward.name}</Text>
                                <Text style={styles.rewardDescription} numberOfLines={2}>
                                    {reward.description}
                                </Text>
                                <View style={[
                                    styles.rewardCost,
                                    !affordable && styles.rewardCostDisabled
                                ]}>
                                    <Ionicons
                                        name="star"
                                        size={16}
                                        color={affordable ? '#F59E0B' : '#9CA3AF'}
                                    />
                                    <Text style={[
                                        styles.rewardCostText,
                                        !affordable && styles.rewardCostTextDisabled
                                    ]}>
                                        {reward.points_cost}
                                    </Text>
                                </View>
                                {!affordable && (
                                    <View style={styles.lockedBadge}>
                                        <Ionicons name="lock-closed" size={12} color="#6B7280" />
                                        <Text style={styles.lockedText}>Bloqueado</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={24} color="#3B82F6" />
                <Text style={styles.infoText}>
                    Pontos não expiram! Continue treinando e acumulando para resgatar recompensas ainda melhores.
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
    balanceCard: {
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    balanceLabel: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    balanceAmount: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    balanceLifetime: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.8,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    earnCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    earnItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    earnIcon: {
        fontSize: 32,
        marginRight: 16,
    },
    earnContent: {
        flex: 1,
    },
    earnTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 2,
    },
    earnPoints: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    rewardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    rewardCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        position: 'relative',
    },
    rewardCardDisabled: {
        opacity: 0.6,
    },
    rewardIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    rewardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 6,
    },
    rewardDescription: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
        lineHeight: 18,
    },
    rewardCost: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    rewardCostDisabled: {
        backgroundColor: '#F3F4F6',
    },
    rewardCostText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
        marginLeft: 4,
    },
    rewardCostTextDisabled: {
        color: '#9CA3AF',
    },
    lockedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    lockedText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 4,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#1E40AF',
        marginLeft: 12,
        lineHeight: 20,
    },
});
