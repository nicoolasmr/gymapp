import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface UserProfile {
    username: string;
    bio: string;
    avatar_url: string;
    followers: number;
    following: number;
    athlete_level: number;
    total_checkins: number;
    visibility: string;
    id: string;
    user_id: string;
}

export default function UserProfileScreen() {
    const { username } = useLocalSearchParams();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, [username]);

    const fetchProfile = async () => {
        try {
            // Get profile
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles_public')
                .select('*')
                .eq('username', username)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // Get advanced stats
            const { data: statsData } = await supabase.rpc('get_user_stats_advanced', {
                p_user_id: profileData.user_id
            });
            setStats(statsData);

        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChallenge = () => {
        Alert.alert(
            'Desafiar Jogador',
            `Para desafiar ${profile?.username}, crie uma competição e convide-o na próxima etapa.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Criar Competição', onPress: () => router.push('/competitions/create' as any) }
            ]
        );
    };

    const handleFollow = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (isFollowing) {
                await supabase.rpc('unfollow_user', {
                    p_follower_id: user.id,
                    p_following_id: profile?.id
                });
            } else {
                await supabase.rpc('follow_user', {
                    p_follower_id: user.id,
                    p_following_id: profile?.id
                });
            }
            setIsFollowing(!isFollowing);
            fetchProfile();
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    if (loading || !profile) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando perfil...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={{ uri: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=random` }}
                    style={styles.avatar}
                />
                <Text style={styles.username}>@{profile.username}</Text>
                {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile.total_checkins}</Text>
                        <Text style={styles.statLabel}>Check-ins</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile.followers}</Text>
                        <Text style={styles.statLabel}>Seguidores</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile.following}</Text>
                        <Text style={styles.statLabel}>Seguindo</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>Nv. {profile.athlete_level}</Text>
                        <Text style={styles.statLabel}>Atleta</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.followButton, isFollowing && styles.followingButton]}
                        onPress={handleFollow}
                    >
                        <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                            {isFollowing ? 'Seguindo' : 'Seguir'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.challengeButton}
                        onPress={handleChallenge}
                    >
                        <Text style={styles.challengeButtonText}>
                            Desafiar ⚔️
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Advanced Stats */}
            {stats && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Estatísticas</Text>

                    <View style={styles.statCard}>
                        <Text style={styles.statCardTitle}>🏋️ Academia Favorita</Text>
                        <Text style={styles.statCardValue}>{stats.favorite_academy || 'N/A'}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statCardTitle}>💪 Modalidade Favorita</Text>
                        <Text style={styles.statCardValue}>{stats.favorite_modality || 'N/A'}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statCardTitle}>⏰ Horário Preferido</Text>
                        <Text style={styles.statCardValue}>
                            {stats.checkins_by_hour ?
                                Object.keys(stats.checkins_by_hour).sort((a, b) =>
                                    stats.checkins_by_hour[b] - stats.checkins_by_hour[a]
                                )[0] + 'h'
                                : 'N/A'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Badges Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏅 Badges</Text>
                <View style={styles.badgesGrid}>
                    <View style={styles.badgeItem}>
                        <Text style={styles.badgeIcon}>🔥</Text>
                        <Text style={styles.badgeLabel}>Streak Master</Text>
                    </View>
                    <View style={styles.badgeItem}>
                        <Text style={styles.badgeIcon}>⚡</Text>
                        <Text style={styles.badgeLabel}>Power User</Text>
                    </View>
                    <View style={styles.badgeItem}>
                        <Text style={styles.badgeIcon}>🎯</Text>
                        <Text style={styles.badgeLabel}>Mission Complete</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
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
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    bio: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    followButton: {
        flex: 1,
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        borderRadius: 8,
    },
    challengeButton: {
        flex: 1,
        backgroundColor: '#F59E0B', // Amber color for PVP
        paddingVertical: 12,
        borderRadius: 8,
    },
    followingButton: {
        backgroundColor: '#E5E7EB',
    },
    followButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    challengeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    followingButtonText: {
        color: '#6B7280',
    },
    section: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    statCardTitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    statCardValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    badgeItem: {
        alignItems: 'center',
        width: '30%',
    },
    badgeIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    badgeLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
});
