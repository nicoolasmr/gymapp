import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface RankingUser {
    user_id: string;
    username: string;
    avatar_url: string;
    posts_count: number;
    likes_received: number;
    rank: number;
}

export default function CommunityRankingScreen() {
    const { modality } = useLocalSearchParams();
    const [ranking, setRanking] = useState<RankingUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRanking();
    }, [modality]);

    const fetchRanking = async () => {
        try {
            const { data: community } = await supabase
                .from('communities')
                .select('id')
                .eq('modality', modality)
                .single();

            if (!community) return;

            const { data, error } = await supabase.rpc('get_community_ranking', {
                p_community_id: community.id,
                p_limit: 50
            });

            if (error) throw error;
            setRanking(data || []);
        } catch (error) {
            console.error('Error fetching ranking:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMedalEmoji = (rank: number) => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando ranking...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🏆 Ranking</Text>
                <Text style={styles.headerSubtitle}>{modality}</Text>
            </View>

            <ScrollView style={styles.ranking} contentContainerStyle={styles.rankingContent}>
                {ranking.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🏆</Text>
                        <Text style={styles.emptyTitle}>Nenhum membro ainda</Text>
                        <Text style={styles.emptySubtitle}>
                            Seja o primeiro a postar na comunidade!
                        </Text>
                    </View>
                ) : (
                    ranking.map((user) => (
                        <View key={user.user_id} style={[
                            styles.rankCard,
                            user.rank <= 3 && styles.rankCardTop
                        ]}>
                            {/* Rank */}
                            <View style={styles.rankBadge}>
                                <Text style={[
                                    styles.rankText,
                                    user.rank <= 3 && styles.rankTextTop
                                ]}>
                                    {getMedalEmoji(user.rank)}
                                </Text>
                            </View>

                            {/* Avatar */}
                            <Image
                                source={{ uri: user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random` }}
                                style={styles.avatar}
                            />

                            {/* Info */}
                            <View style={styles.userInfo}>
                                <Text style={styles.username}>@{user.username}</Text>
                                <View style={styles.stats}>
                                    <Text style={styles.statText}>
                                        📝 {user.posts_count} posts
                                    </Text>
                                    <Text style={styles.statText}>
                                        ❤️ {user.likes_received} curtidas
                                    </Text>
                                </View>
                            </View>

                            {/* Score */}
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreValue}>
                                    {Number(user.posts_count) + Number(user.likes_received)}
                                </Text>
                                <Text style={styles.scoreLabel}>pontos</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
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
        backgroundColor: '#FFFFFF',
        padding: 20,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    ranking: {
        flex: 1,
    },
    rankingContent: {
        padding: 16,
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
    },
    rankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    rankCardTop: {
        borderWidth: 2,
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
    },
    rankBadge: {
        width: 40,
        marginRight: 12,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    rankTextTop: {
        fontSize: 28,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 6,
    },
    stats: {
        flexDirection: 'row',
        gap: 12,
    },
    statText: {
        fontSize: 12,
        color: '#6B7280',
    },
    scoreContainer: {
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    scoreLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
    },
});
