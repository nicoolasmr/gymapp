import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    is_following: boolean;
}

export default function FindFriendsScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async (query = '') => {
        try {
            setLoading(true);
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;

            let dbQuery = supabase
                .from('user_profiles_public')
                .select('*')
                .neq('id', currentUser.id)
                .limit(50);

            if (query) {
                dbQuery = dbQuery.ilike('full_name', `%${query}%`);
            }

            const { data: usersData, error } = await dbQuery;

            if (error) throw error;

            // Check following status
            const { data: followingData } = await supabase
                .from('user_follows')
                .select('following_id')
                .eq('follower_id', currentUser.id);

            const followingIds = new Set(followingData?.map(f => f.following_id));

            const formattedUsers = usersData?.map(u => ({
                ...u,
                is_following: followingIds.has(u.id)
            })) || [];

            setUsers(formattedUsers);

        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (targetUserId: string, isFollowing: boolean) => {
        try {
            setFollowLoading(targetUserId);
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;

            if (isFollowing) {
                await supabase.rpc('unfollow_user', {
                    p_follower_id: currentUser.id,
                    p_following_id: targetUserId
                });
            } else {
                await supabase.rpc('follow_user', {
                    p_follower_id: currentUser.id,
                    p_following_id: targetUserId
                });

                // Trigger Onboarding Advance
                await supabase.rpc('advance_user_onboarding', {
                    p_user_id: currentUser.id,
                    p_event: 'friend_added'
                });
            }

            // Update local state
            setUsers(users.map(u =>
                u.id === targetUserId
                    ? { ...u, is_following: !isFollowing }
                    : u
            ));

        } catch (error) {
            console.error('Error following user:', error);
            Alert.alert('Erro', 'Não foi possível realizar a ação.');
        } finally {
            setFollowLoading(null);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        // Debounce could be added here, but for simplicity call directly or waiting for enter
        // Let's simple filter locally or fetch if enter pressed? 
        // For UX, let's fetch on text change with small timeout or just fetch all
        fetchUsers(text);
    };

    const handleProfileClick = (userId: string) => {
        // Implement profile view, currently we just have own profile
        // Strategy: Create a public profile route or reuse profile with param
        // For now, let's create a placeholder alert or if /profile/[id] existed.
        // Assuming we need to create /profile/[id].tsx next.
        router.push(`/profile/${userId}`);
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/feed');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Encontrar Amigos</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    returnKeyType="search"
                />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.userCard}>
                            <TouchableOpacity
                                style={styles.userInfoContainer}
                                onPress={() => handleProfileClick(item.id)}
                            >
                                <Image
                                    source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
                                    style={styles.avatar}
                                />
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{item.full_name}</Text>
                                    <Text style={styles.userUsername}>@{item.username || 'user'}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.followButton,
                                    item.is_following ? styles.followingButton : {}
                                ]}
                                onPress={() => handleFollow(item.id, item.is_following)}
                                disabled={followLoading === item.id}
                            >
                                {followLoading === item.id ? (
                                    <ActivityIndicator size="small" color={item.is_following ? "#111827" : "#fff"} />
                                ) : (
                                    <Text style={[
                                        styles.followButtonText,
                                        item.is_following ? styles.followingButtonText : {}
                                    ]}>
                                        {item.is_following ? 'Seguindo' : 'Seguir'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
                    }
                />
            )}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        margin: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    listContent: {
        padding: 16,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: '#E5E7EB',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    userUsername: {
        fontSize: 14,
        color: '#6B7280',
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#2563eb',
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    followingButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    followButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    followingButtonText: {
        color: '#374151',
    },
    userInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#6B7280',
        fontSize: 16,
    },
});
