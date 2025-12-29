import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, RefreshControl, Alert, TextInput, Share, Modal, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../hooks/useAuthStore';
import { userService } from '../../services/userService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

const MODALITY_THEMES: Record<string, { name: string; color: string; icon: string }> = {
    'crossfit_box': { name: 'CrossFit', color: '#F97316', icon: 'barbell' },
    'gym_standard': { name: 'Musculação', color: '#EF4444', icon: 'fitness' },
    'studio': { name: 'Studios & Yoga', color: '#8B5CF6', icon: 'body' },
};

export default function ProfileScreen() {
    const { user, signOut } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [profile, setProfile] = useState<any>(null);
    const [membership, setMembership] = useState<any>(null);
    const [stats, setStats] = useState({ totalCheckins: 0, streak: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [familyDetails, setFamilyDetails] = useState<any>(null);
    const [levelProgress, setLevelProgress] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [pendingCheckin, setPendingCheckin] = useState<any>(null);
    const [myCommunities, setMyCommunities] = useState<any[]>([]);

    const fetchData = async () => {
        if (!user) return;
        try {
            const [userProfile, userMembership, userStats, userHistory, userFamily, userLevel, userCommunities] = await Promise.all([
                userService.getUserProfile(user.id),
                userService.getMembership(user.id),
                userService.getStats(user.id),
                userService.getCheckinHistory(user.id),
                userService.getFamilyDetails(user.id),
                userService.getLevelProgress(user.id),
                supabase.from('community_members').select('*, communities(*)').eq('user_id', user.id)
            ]);

            setProfile(userProfile);
            setNewName(userProfile?.full_name || '');
            setMembership(userMembership);
            setStats(userStats);
            setHistory(userHistory || []);
            setFamilyDetails(userFamily);
            setLevelProgress(userLevel);
            setMyCommunities(userCommunities.data || []);

            // Fetch pending check-ins directly via Supabase for simplicity
            const { data: checkinData, error: checkinError } = await (supabase as any)
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

        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleUpdateAvatar = async () => {
        if (!user) return;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // Enables the cropping/positioning editor
                aspect: [1, 1], // Square aspect ratio
                quality: 0.5,
                base64: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const image = result.assets[0];
            if (!image.base64) return;

            // Optimistic update
            const tempUri = image.uri;
            const originalAvatar = profile?.avatar_url;
            setProfile({ ...profile, avatar_url: tempUri });

            const fileName = `${user.id}/${Date.now()}.jpg`;
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, decode(image.base64), {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) {
                // Revert optimistic update
                setProfile({ ...profile, avatar_url: originalAvatar });
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update profile in database
            await userService.updateUserProfile(user.id, { avatar_url: publicUrl });
            setProfile({ ...profile, avatar_url: publicUrl });

            // Advance Onboarding (Day 2 -> 3)
            await supabase.rpc('advance_user_onboarding', {
                p_user_id: user.id,
                p_event: 'profile_updated'
            });

            Alert.alert('Sucesso', 'Foto de perfil atualizada!');

        } catch (error: any) {
            console.error('Avatar upload error:', error);
            Alert.alert('Erro', 'Falha ao atualizar foto. Tente novamente.');
        }
    };

    const handleUpdateProfile = async () => {
        if (!user) return;
        try {
            await userService.updateUserProfile(user.id, { full_name: newName });
            setProfile({ ...profile, full_name: newName });
            setIsEditing(false);

            // Advance Onboarding (Day 2 -> 3) - Also triggers on name update
            await supabase.rpc('advance_user_onboarding', {
                p_user_id: user.id,
                p_event: 'profile_updated'
            });

            Alert.alert('Sucesso', 'Perfil atualizado!');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao atualizar perfil.');
        }
    };

    const handleInviteMember = async () => {
        if (!user) return;
        try {
            const token = await userService.createFamilyInvite(user.id);
            const inviteLink = `fitnessapp://invite?token=${token}`;

            await Share.share({
                message: `Venha treinar comigo no Fitness App! Aceite meu convite para o Plano Família: ${inviteLink}`,
                url: inviteLink, // iOS only
            });

            // Refresh data to show pending invite if we were to show it
            fetchData();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível gerar o convite.');
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!user) return;
        Alert.alert(
            'Remover Membro',
            'Tem certeza que deseja remover este membro do plano?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await userService.removeFamilyMember(user.id, memberId);
                            Alert.alert('Sucesso', 'Membro removido.');
                            fetchData();
                        } catch (error: any) {
                            Alert.alert('Erro', error.message || 'Falha ao remover membro.');
                        }
                    }
                }
            ]
        );
    };

    const handleSignOut = async () => {
        await signOut();
        router.replace('/(auth)/login');
    };

    const getBadge = (count: number) => {
        if (count >= 30) return { icon: 'trophy', color: '#fbbf24', label: 'Viciado' }; // Gold
        if (count >= 15) return { icon: 'medal', color: '#9ca3af', label: 'Comprometido' }; // Silver
        if (count >= 5) return { icon: 'ribbon', color: '#b45309', label: 'Iniciante' }; // Bronze
        return null;
    };

    const badge = getBadge(stats.totalCheckins);

    const getLevelColor = (levelName: string) => {
        switch (levelName) {
            case 'Bronze': return '#cd7f32';
            case 'Prata': return '#9ca3af';
            case 'Ouro': return '#fbbf24';
            case 'Diamante': return '#60a5fa';
            case 'Lendário': return '#8b5cf6';
            default: return '#2563eb';
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'User'}&background=random` }}
                        style={styles.avatar}
                    />
                    <TouchableOpacity style={styles.editAvatarButton} onPress={handleUpdateAvatar}>
                        <Ionicons name="camera" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => router.push('/settings/privacy')}
                >
                    <Ionicons name="settings-sharp" size={24} color="#374151" />
                </TouchableOpacity>

                {isEditing ? (
                    <View style={styles.editNameContainer}>
                        <TextInput
                            style={styles.nameInput}
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TouchableOpacity onPress={handleUpdateProfile}>
                            <Ionicons name="checkmark-circle" size={28} color="#2563eb" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.nameContainer}>
                        <Text style={styles.name}>{profile?.full_name || 'Usuário'}</Text>
                        <TouchableOpacity onPress={() => setIsEditing(true)}>
                            <Ionicons name="pencil" size={16} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                )}
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            {/* Pending Check-in Card (High Priority) */}
            {pendingCheckin && (
                <TouchableOpacity
                    style={styles.pendingCheckinCard}
                    onPress={() => router.push({ pathname: '/checkin', params: { academyId: pendingCheckin.academy_id, academyName: pendingCheckin.academies?.name } } as any)}
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

            {/* Stats Grid */}
            <TouchableOpacity onPress={() => router.push('/profile/progress')}>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalCheckins}</Text>
                        <Text style={styles.statLabel}>Check-ins</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.streak} dias</Text>
                        <Text style={styles.statLabel}>Sequência</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Level Progress Card (NEW) */}
            {levelProgress && (
                <View style={[styles.section, { paddingTop: 0 }]}>
                    <Text style={styles.sectionTitle}>Meu Nível</Text>
                    <View style={styles.levelCard}>
                        {/* Header */}
                        <View style={styles.levelHeader}>
                            <View style={[styles.levelIconContainer, { backgroundColor: getLevelColor(levelProgress.level_name) }]}>
                                <Ionicons name="trophy" size={24} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.levelName}>{levelProgress.level_name}</Text>
                                <Text style={styles.levelBenefit}>{levelProgress.benefits?.description || 'Nível Inicial'}</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { backgroundColor: getLevelColor(levelProgress.level_name), width: `${Math.min((levelProgress.current_xp / levelProgress.next_level_xp) * 100, 100)}%` }]} />
                            </View>
                            <Text style={styles.progressText}>
                                {levelProgress.current_xp} / {levelProgress.next_level_xp} XP
                            </Text>
                        </View>

                        {/* Next Level Info */}
                        {!levelProgress.is_max_level ? (
                            <Text style={styles.nextLevelText}>
                                Faltam <Text style={{ fontWeight: 'bold' }}>{levelProgress.next_level_xp - levelProgress.current_xp} XP</Text> para o próximo nível.
                            </Text>
                        ) : (
                            <Text style={styles.nextLevelText}>Você atingiu o nível máximo!</Text>
                        )}

                        <TouchableOpacity style={styles.xpInfoButton} onPress={() => Alert.alert('Como ganhar XP?', '• Check-in: +10 XP\n• Missão Semanal: +50 XP\n• Vencer Desafio PVP: +75 XP')}>
                            <Text style={styles.xpInfoText}>Como ganhar XP?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* My Communities (NEW) */}
            {myCommunities.length > 0 && (
                <View style={[styles.section, { paddingBottom: 0 }]}>
                    <Text style={styles.sectionTitle}>Minhas Comunidades</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
                        {myCommunities.map((item) => {
                            const modality = item.communities?.modality;
                            const theme = MODALITY_THEMES[modality] || { name: 'Comunidade', color: '#2563eb', icon: 'people' };
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.communityCard, { borderColor: theme.color + '40' }]}
                                    onPress={() => router.push(`/community/${modality}`)}
                                >
                                    <View style={[styles.communityIcon, { backgroundColor: theme.color + '20' }]}>
                                        <Ionicons name={theme.icon as any} size={24} color={theme.color} />
                                    </View>
                                    <Text style={styles.communityName}>{theme.name}</Text>
                                    <View style={[styles.communityBadge, { backgroundColor: theme.color }]}>
                                        <Text style={styles.communityBadgeText}>Membro</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Badges / Conquistas */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conquistas</Text>
                <View style={styles.badgesContainer}>
                    {/* Badge 1 - Iniciante */}
                    <View style={[styles.badgeItem, stats.totalCheckins >= 5 ? styles.badgeUnlocked : styles.badgeLocked]}>
                        <View style={[styles.badgeIcon, { backgroundColor: stats.totalCheckins >= 5 ? '#FEF3C7' : '#F3F4F6' }]}>
                            <Ionicons name="ribbon" size={24} color={stats.totalCheckins >= 5 ? '#D97706' : '#9CA3AF'} />
                        </View>
                        <Text style={styles.badgeName}>Iniciante</Text>
                        <Text style={styles.badgeDesc}>5 treinos</Text>
                    </View>

                    {/* Badge 2 - Comprometido */}
                    <View style={[styles.badgeItem, stats.totalCheckins >= 15 ? styles.badgeUnlocked : styles.badgeLocked]}>
                        <View style={[styles.badgeIcon, { backgroundColor: stats.totalCheckins >= 15 ? '#E0E7FF' : '#F3F4F6' }]}>
                            <Ionicons name="medal" size={24} color={stats.totalCheckins >= 15 ? '#4F46E5' : '#9CA3AF'} />
                        </View>
                        <Text style={styles.badgeName}>Focado</Text>
                        <Text style={styles.badgeDesc}>15 treinos</Text>
                    </View>

                    {/* Badge 3 - Viciado */}
                    <View style={[styles.badgeItem, stats.totalCheckins >= 30 ? styles.badgeUnlocked : styles.badgeLocked]}>
                        <View style={[styles.badgeIcon, { backgroundColor: stats.totalCheckins >= 30 ? '#FEF9C3' : '#F3F4F6' }]}>
                            <Ionicons name="trophy" size={24} color={stats.totalCheckins >= 30 ? '#CA8A04' : '#9CA3AF'} />
                        </View>
                        <Text style={styles.badgeName}>Mestre</Text>
                        <Text style={styles.badgeDesc}>30 treinos</Text>
                    </View>
                </View>
            </View>

            {/* Invite & Earn Banner */}
            <TouchableOpacity
                style={styles.inviteBanner}
                onPress={() => router.push('/profile/referrals')}
            >
                <View style={styles.inviteContent}>
                    <Ionicons name="gift" size={24} color="#fff" />
                    <View style={styles.inviteTextContainer}>
                        <Text style={styles.inviteTitle}>Indique e Ganhe 10% OFF</Text>
                        <Text style={styles.inviteSubtitle}>Convide amigos e ganhe descontos</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Plan Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Meu Plano</Text>
                <View style={styles.card}>
                    {membership ? (
                        <>
                            <View style={styles.planHeader}>
                                <Text style={styles.planName}>
                                    {membership.plan_id === 1 ? 'Plano Solo' : 'Plano Família'}
                                </Text>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: membership.status === 'active' ? '#dcfce7' : '#fee2e2' }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        { color: membership.status === 'active' ? '#166534' : '#991b1b' }
                                    ]}>
                                        {membership.status === 'active' ? 'ATIVO' : 'INATIVO'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.planDate}>
                                Renovação: {new Date(membership.renewal_date || membership.start_date).toLocaleDateString()}
                            </Text>

                            {/* Family Members List (Only for Family Plan) */}
                            {membership.plan_id === 2 && familyDetails?.has_family && (
                                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                                        Membros da Família ({familyDetails.members.length}/4)
                                    </Text>
                                    {familyDetails.members.map((member: any) => (
                                        <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                                                    <Text style={{ color: '#1e40af', fontWeight: 'bold' }}>
                                                        {member.full_name?.charAt(0) || 'U'}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: '500' }}>
                                                        {member.full_name || 'Usuário'} {member.role === 'owner' && '(Titular)'}
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{member.email}</Text>
                                                </View>
                                            </View>
                                            {familyDetails.is_owner && member.role !== 'owner' && (
                                                <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}

                                    {/* Pending Invites */}
                                    {familyDetails.invites && familyDetails.invites.map((invite: any) => (
                                        <View key={invite.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between', opacity: 0.7 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                                                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                                                </View>
                                                <View>
                                                    <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: '500', fontStyle: 'italic' }}>
                                                        Convite Pendente
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Expira em {new Date(invite.expires_at).toLocaleDateString()}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}

                                    {familyDetails.is_owner && (familyDetails.members.length + (familyDetails.invites?.length || 0)) < 4 && (
                                        <TouchableOpacity style={{ marginTop: 8 }} onPress={handleInviteMember}>
                                            <Text style={{ color: '#2563eb', fontSize: 14, fontWeight: '500' }}>
                                                + Adicionar Membro
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.noPlan}>
                            <Text style={styles.noPlanText}>Você ainda não tem um plano ativo.</Text>
                            <TouchableOpacity
                                style={styles.subscribeButton}
                                onPress={() => router.push('/modal/subscribe')}
                            >
                                <Text style={styles.subscribeButtonText}>Assinar Agora</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View >

            {/* History */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Histórico de Treinos</Text>
                {
                    history.length > 0 ? (
                        history.map((checkin) => (
                            <View key={checkin.id} style={styles.historyItem}>
                                <View style={styles.historyIcon}>
                                    <Ionicons name="barbell" size={20} color="#2563eb" />
                                </View>
                                <View style={styles.historyInfo}>
                                    <Text style={styles.historyAcademy}>{checkin.academies?.name}</Text>
                                    <Text style={styles.historyDate}>
                                        {new Date(checkin.created_at).toLocaleDateString()} às {new Date(checkin.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Nenhum treino registrado ainda.</Text>
                    )
                }
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                <Text style={styles.logoutText}>Sair da Conta</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingTop: 60, // Increased top padding for status bar/safe area
    },
    settingsButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e5e7eb',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2563eb',
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    editNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    nameInput: {
        fontSize: 20,
        fontWeight: 'bold',
        borderBottomWidth: 1,
        borderBottomColor: '#2563eb',
        padding: 0,
        minWidth: 150,
        textAlign: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    email: {
        fontSize: 16,
        color: '#6b7280',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        textTransform: 'uppercase',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: '#e5e7eb',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    planName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    planDate: {
        fontSize: 14,
        color: '#6b7280',
    },
    noPlan: {
        alignItems: 'center',
        padding: 8,
    },
    noPlanText: {
        color: '#6b7280',
        marginBottom: 12,
    },
    subscribeButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    subscribeButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    historyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    historyInfo: {
        flex: 1,
    },
    historyAcademy: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    historyDate: {
        fontSize: 14,
        color: '#6b7280',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        marginTop: 16,
    },
    logoutButton: {
        margin: 16,
        padding: 16,
        backgroundColor: '#fee2e2',
        borderRadius: 12,
        alignItems: 'center',
    },
    logoutText: {
        color: '#991b1b',
        fontWeight: '600',
        fontSize: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        padding: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    badgesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8,
    },
    badgeItem: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    badgeUnlocked: {
        borderColor: '#fbbf24',
        backgroundColor: '#fffbeb',
    },
    badgeLocked: {
        opacity: 0.6,
        backgroundColor: '#f9fafb',
    },
    badgeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
    },
    badgeDesc: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
    },
    inviteBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2563eb',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    inviteContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inviteTextContainer: {
        flex: 1,
    },
    inviteTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    inviteSubtitle: {
        color: '#bfdbfe',
        fontSize: 12,
    },
    pendingCheckinCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 16,
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
    // Level Card Styles
    levelCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    levelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    levelIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    levelName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    levelBenefit: {
        fontSize: 12,
        color: '#6b7280',
    },
    progressBarContainer: {
        marginBottom: 12,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'right',
        fontWeight: '500',
    },
    nextLevelText: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 12,
    },
    xpInfoButton: {
        alignSelf: 'flex-start',
    },
    xpInfoText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    // Community Card Styles
    communityCard: {
        backgroundColor: '#fff',
        width: 120,
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    communityIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    communityName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    communityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    communityBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
});
