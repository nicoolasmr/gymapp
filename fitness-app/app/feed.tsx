import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface FeedPost {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string;
    event_type: string;
    message: string;
    photo_url: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    is_liked: boolean;
}

const EVENT_ICONS: { [key: string]: string } = {
    checkin: '✅',
    badge: '🏅',
    streak: '🔥',
    challenge: '⚔️',
    mission: '🎯',
};

const EVENT_COLORS: { [key: string]: string } = {
    checkin: '#10B981',
    badge: '#F59E0B',
    streak: '#EF4444',
    challenge: '#8B5CF6',
    mission: '#3B82F6',
};

export default function SocialFeedScreen() {
    const router = useRouter();
    const [feed, setFeed] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc('get_social_feed', {
                p_user_id: user.id,
                p_limit: 50
            });

            if (error) throw error;
            setFeed(data || []);
        } catch (error) {
            console.error('Error fetching feed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchFeed();
    };

    const handleLike = async (postId: string, isLiked: boolean) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (isLiked) {
                await supabase.rpc('unlike_feed_post', {
                    p_feed_id: postId,
                    p_user_id: user.id
                });
            } else {
                await supabase.rpc('like_feed_post', {
                    p_feed_id: postId,
                    p_user_id: user.id
                });
            }

            // Update local state
            setFeed(feed.map(post =>
                post.id === postId
                    ? {
                        ...post,
                        is_liked: !isLiked,
                        likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1
                    }
                    : post
            ));
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const postDate = new Date(date);
        const diff = now.getTime() - postDate.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando feed...</Text>
            </View>
        );
    }

    // ... imports

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (router.canGoBack()) router.back();
                    else router.replace('/(tabs)/home');
                }}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Feed Social</Text>
                <TouchableOpacity onPress={() => router.push('/friends')} style={styles.backButton}>
                    <Ionicons name="person-add" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.feed}
                contentContainerStyle={styles.feedContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {feed.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>👥</Text>
                        <Text style={styles.emptyTitle}>Nenhuma atividade</Text>
                        <Text style={styles.emptySubtitle}>
                            Siga amigos para ver suas atividades aqui!
                        </Text>
                        <TouchableOpacity
                            style={styles.findFriendsButton}
                            onPress={() => router.push('/friends')}
                        >
                            <Text style={styles.findFriendsButtonText}>Encontrar Amigos</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    feed.map((post) => (
                        <View key={post.id} style={styles.postCard}>
                            {/* Post Header */}
                            <View style={styles.postHeader}>
                                <Image
                                    source={{ uri: post.avatar_url || `https://ui-avatars.com/api/?name=${post.username}&background=random` }}
                                    style={styles.postAvatar}
                                />
                                <View style={styles.postHeaderInfo}>
                                    <Text style={styles.postUsername}>@{post.username}</Text>
                                    <Text style={styles.postTime}>{getTimeAgo(post.created_at)}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.eventBadge,
                                        { backgroundColor: EVENT_COLORS[post.event_type] + '20' }
                                    ]}
                                >
                                    <Text style={styles.eventIcon}>{EVENT_ICONS[post.event_type]}</Text>
                                </View>
                            </View>

                            {/* Post Content */}
                            <Text style={styles.postMessage}>{post.message}</Text>

                            {/* Post Photo */}
                            {post.photo_url && (
                                <Image
                                    source={{ uri: post.photo_url }}
                                    style={styles.postPhoto}
                                />
                            )}

                            {/* Post Actions */}
                            <View style={styles.postActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleLike(post.id, post.is_liked)}
                                >
                                    <Ionicons
                                        name={post.is_liked ? 'heart' : 'heart-outline'}
                                        size={24}
                                        color={post.is_liked ? '#EF4444' : '#6B7280'}
                                    />
                                    <Text style={[
                                        styles.actionText,
                                        post.is_liked && styles.actionTextActive
                                    ]}>
                                        {post.likes_count}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton}>
                                    <Ionicons name="chatbubble-outline" size={24} color="#6B7280" />
                                    <Text style={styles.actionText}>{post.comments_count}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton}>
                                    <Ionicons name="share-outline" size={24} color="#6B7280" />
                                </TouchableOpacity>
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    feed: {
        flex: 1,
    },
    feedContent: {
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
    postCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    postHeaderInfo: {
        flex: 1,
    },
    postUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    postTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    eventBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventIcon: {
        fontSize: 16,
    },
    postMessage: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 22,
        marginBottom: 12,
    },
    postPhoto: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
    },
    postActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    actionTextActive: {
        color: '#EF4444',
    },
    findFriendsButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#2563eb',
        borderRadius: 24,
    },
    findFriendsButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
