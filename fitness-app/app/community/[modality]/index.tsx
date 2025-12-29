import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    ImageBackground
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

interface CommunityPost {
    id: string;
    user_id: string;
    username?: string; // Add username/avatar fetch if possible or join
    message: string;
    photo_url: string;
    likes_count: number;
    created_at: string;
}

const MODALITY_THEMES: Record<string, { name: string; color: string; icon: string }> = {
    'crossfit_box': { name: 'CrossFit', color: '#F97316', icon: 'barbell' },
    'gym_standard': { name: 'Musculação', color: '#EF4444', icon: 'fitness' },
    'studio': { name: 'Studios & Yoga', color: '#8B5CF6', icon: 'body' },
};

export default function CommunityScreen() {
    const { modality } = useLocalSearchParams();
    const router = useRouter();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [newPost, setNewPost] = useState('');
    const [loading, setLoading] = useState(true);

    // Community Data
    const [community, setCommunity] = useState<any>(null);
    const [isMember, setIsMember] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [academies, setAcademies] = useState<any[]>([]);

    const theme = MODALITY_THEMES[modality as string] || { name: 'Comunidade', color: '#2563eb', icon: 'people' };

    useEffect(() => {
        if (modality) {
            fetchCommunityData();
        }
    }, [modality]);

    const fetchCommunityData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Community Info
            const { data: commData, error: commError } = await supabase
                .from('communities')
                .select('*')
                .eq('modality', modality)
                .single();

            if (commError && commError.code !== 'PGRST116') {
                console.error('Error fetching community:', commError);
            }

            if (commData) {
                setCommunity(commData);
                setMemberCount(commData.members_count || 0); // Use stored count or count real time if preferred

                // Check membership
                const { data: memberData } = await supabase
                    .from('community_members')
                    .select('id')
                    .eq('community_id', commData.id)
                    .eq('user_id', user.id)
                    .single();

                setIsMember(!!memberData);

                // Fetch Posts
                fetchPosts(commData.id);
            } else {
                // Fallback if community doesn't exist in DB yet (display static info)
                setCommunity({
                    description: 'Comunidade oficial para praticantes desta modalidade.',
                    // We can't fetch posts if no ID, but we can show academies
                });
            }

            // 2. Fetch Academies of this modality
            const { data: academiesData } = await supabase
                .from('academies')
                .select('id, name, logo_url, address')
                .eq('modality', modality)
                .limit(5);

            setAcademies(academiesData || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async (communityId: string) => {
        const { data } = await supabase
            .from('community_posts')
            .select('*') // Enhance with profile join if needed
            .eq('community_id', communityId)
            .order('created_at', { ascending: false })
            .limit(50);
        setPosts(data || []);
    };

    const handleJoin = async () => {
        if (!community?.id) {
            Alert.alert('Erro', 'Comunidade não encontrada no sistema.');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Insert Member
            const { error } = await supabase
                .from('community_members')
                .insert({ community_id: community.id, user_id: user.id });

            if (error) throw error;

            setIsMember(true);
            setMemberCount(prev => prev + 1);

            // Update Onboarding (Step 3)
            await supabase.rpc('advance_user_onboarding', {
                p_user_id: user.id,
                p_event: 'joined_community'
            });

            Alert.alert('Bem-vindo!', `Você agora faz parte da comunidade ${theme.name}.`);

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível entrar na comunidade.');
        }
    };

    const handleLeave = async () => {
        if (!community?.id) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('community_members')
                .delete()
                .eq('community_id', community.id)
                .eq('user_id', user.id);

            setIsMember(false);
            setMemberCount(prev => Math.max(0, prev - 1));

        } catch (error) {
            console.error(error);
        }
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/community');
        }
    };

    const createPost = async () => {
        if (!newPost.trim() || !community?.id) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('community_posts')
                .insert({
                    community_id: community.id,
                    user_id: user.id,
                    message: newPost
                });

            if (error) throw error;

            setNewPost('');
            fetchPosts(community.id);
        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert('Erro', 'Não foi possível publicar.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.color} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Hero Header */}
                <ImageBackground
                    source={{ uri: community?.banner_url || 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }}
                    style={styles.hero}
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroGradient}
                    >
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.heroContent}>
                            <View style={[styles.heroIcon, { backgroundColor: theme.color }]}>
                                <Ionicons name={theme.icon as any} size={32} color="#fff" />
                            </View>
                            <Text style={styles.heroTitle}>{theme.name}</Text>
                            <Text style={styles.heroStats}>{memberCount} membros • {academies.length} academias</Text>

                            {!isMember ? (
                                <TouchableOpacity style={[styles.joinButton, { backgroundColor: theme.color }]} onPress={handleJoin}>
                                    <Text style={styles.joinButtonText}>Entrar na Comunidade</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.joinedBadge}>
                                    <Ionicons name="checkmark-circle" size={20} color={theme.color} />
                                    <Text style={[styles.joinedText, { color: theme.color }]}>Você já é membro</Text>
                                    <TouchableOpacity onPress={handleLeave}>
                                        <Text style={styles.leaveText}>Sair</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </ImageBackground>

                <View style={styles.content}>
                    <Text style={styles.description}>{community?.description || 'Junte-se a nós para evoluir juntos!'}</Text>

                    {/* Participating Academies */}
                    {academies.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Academias Parceiras</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.academiesList}>
                                {academies.map((gym) => (
                                    <TouchableOpacity
                                        key={gym.id}
                                        style={styles.gymCard}
                                        onPress={() => router.push(`/academy/${gym.id}`)}
                                    >
                                        <Image source={{ uri: gym.logo_url || 'https://via.placeholder.com/60' }} style={styles.gymLogo} />
                                        <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Feed Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Feed da Comunidade</Text>

                        {isMember ? (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`Compartilhe com a galera do ${theme.name}...`}
                                    value={newPost}
                                    onChangeText={setNewPost}
                                    multiline
                                />
                                <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.color }]} onPress={createPost}>
                                    <Ionicons name="send" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.lockedFeed}>
                                <Ionicons name="lock-closed-outline" size={24} color="#6b7280" />
                                <Text style={styles.lockedText}>Entre na comunidade para postar e interagir.</Text>
                            </View>
                        )}

                        <View style={styles.postsList}>
                            {posts.length > 0 ? posts.map((post) => (
                                <View key={post.id} style={styles.postCard}>
                                    <View style={styles.postHeader}>
                                        <View style={styles.postAvatar}>
                                            <Ionicons name="person" size={16} color="#9ca3af" />
                                        </View>
                                        <Text style={styles.postAuthor}>@{post.username || 'Membro'}</Text>
                                        <Text style={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.postBody}>{post.message}</Text>
                                    <View style={styles.postFooter}>
                                        <Ionicons name="heart-outline" size={20} color="#6b7280" />
                                        <Text style={styles.postLikes}>{post.likes_count}</Text>
                                    </View>
                                </View>
                            )) : (
                                <Text style={styles.emptyText}>Nenhuma publicação ainda. Seja o primeiro!</Text>
                            )}
                        </View>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    hero: {
        height: 320,
        justifyContent: 'flex-end',
    },
    heroGradient: {
        height: '100%',
        justifyContent: 'flex-end',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
    },
    heroContent: {
        alignItems: 'center',
        marginBottom: 20,
    },
    heroIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#fff',
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },
    heroStats: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 24,
    },
    joinButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    joinButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    joinedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    joinedText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    leaveText: {
        fontSize: 12,
        color: '#6b7280',
        textDecorationLine: 'underline',
        marginLeft: 8,
    },
    content: {
        padding: 20,
    },
    description: {
        fontSize: 16,
        color: '#4b5563',
        lineHeight: 24,
        marginBottom: 32,
        textAlign: 'center',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    academiesList: {
        gap: 12,
        paddingRight: 20,
    },
    gymCard: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        width: 120,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    gymLogo: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 8,
        backgroundColor: '#f3f4f6',
    },
    gymName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 48,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockedFeed: {
        backgroundColor: '#f3f4f6',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    lockedText: {
        color: '#6b7280',
        fontSize: 14,
    },
    postsList: {
        gap: 16,
    },
    postCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    postAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    postAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        flex: 1,
    },
    postDate: {
        fontSize: 12,
        color: '#9ca3af',
    },
    postBody: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
        marginBottom: 12,
    },
    postFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    postLikes: {
        fontSize: 12,
        color: '#6b7280',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        fontStyle: 'italic',
        marginTop: 20,
    },
});
