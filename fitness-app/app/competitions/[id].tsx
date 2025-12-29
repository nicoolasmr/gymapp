import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Share, Modal, Alert, Animated, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { competitionService, Competition, LeaderboardEntry } from '../../services/competitionService';
import { useAuthStore } from '../../hooks/useAuthStore';

export default function CompetitionDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [competition, setCompetition] = useState<Competition | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<LeaderboardEntry | undefined>(undefined);

    // Share Modal States
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    // State for join logic
    const [isParticipant, setIsParticipant] = useState(false);
    const [joining, setJoining] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);

    const competitionId = Array.isArray(id) ? id[0] : id;

    // Generated Deep Link
    const deepLink = competition ? `antigravaty://competitions/${competition.id}` : '';

    const handleSharePress = () => {
        setShareModalVisible(true);
    };

    const handleCopyLink = async () => {
        await Clipboard.setStringAsync(deepLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        if (!competition) return;
        try {
            const shareContent = {
                message: `Venha participar da competição "${competition.name}" no Antigravaty! 🏆\n\nRegra: ${competition.scoring_rule === 'total_checkins' ? 'Quem fizer mais check-ins vence!' : 'Veja quem mantém o maior foco!'}\n\nEntre agora pelo link:\n${deepLink}`,
                title: `Desafio: ${competition.name}`,
            } as any;

            // iOS usually handles the URL field better for sharing sheets
            if (Platform.OS === 'ios') {
                shareContent.url = deepLink;
            }

            await Share.share(shareContent);
            setShareModalVisible(false);
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
            // Fallback for Web if navigator.share fails or is not supported
            if (Platform.OS === 'web') {
                await handleCopyLink();
                Alert.alert('Link copiado', 'O navegador não suporta compartilhamento direto. O link foi copiado para sua área de transferência!');
            }
        }
    };

    const handleJoin = async () => {
        if (!user || !competition) return;
        setJoining(true);
        try {
            // User invites themselves
            await competitionService.addParticipant(competition.id, user.id, user.id);
            Alert.alert('Sucesso', 'Você entrou na competição! Boa sorte! 🚀');
            // Refresh data to switch view
            fetchData();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível entrar na competição.');
        } finally {
            setJoining(false);
        }
    };

    const fetchData = async () => {
        if (!competitionId) return;
        try {
            const [compData, lbData, partsData] = await Promise.all([
                competitionService.getCompetitionDetails(competitionId),
                competitionService.getLeaderboard(competitionId),
                competitionService.getParticipants(competitionId)
            ]);
            setCompetition(compData);
            setLeaderboard(lbData);
            setParticipants(partsData || []);

            if (user) {
                // Check if user is already a participant (accepted or pending)
                const userEntry = partsData?.find((p: any) => p.user_id === user.id);
                const isPart = !!userEntry;
                setIsParticipant(isPart);

                const myRank = lbData.find(entry => entry.user_id === user.id);
                setUserRank(myRank);
            }
        } catch (error) {
            console.error('Erro ao carregar competição:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [competitionId, user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!competition) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Competição não encontrada</Text>
                </View>
            </View>
        );
    }

    const startDate = new Date(competition.start_date);
    const endDate = new Date(competition.end_date);
    const isActive = competition.status === 'active';
    const isEnded = competition.status === 'ended';

    // RENDER JOIN SCREEN IF NOT PARTICIPANT
    if (!isParticipant) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Convite</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content}>
                    {/* Hero Join */}
                    <View style={styles.joinHero}>
                        <View style={styles.joinIconContainer}>
                            <Ionicons name="trophy" size={48} color="#2563eb" />
                        </View>
                        <Text style={styles.joinTitle}>{competition.name}</Text>
                        <Text style={styles.joinSubtitle}>
                            {competition.scoring_rule === 'total_checkins' ? 'Ganhe quem treinar mais!' : 'Mantenha a constância!'}
                        </Text>
                    </View>

                    {/* Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Sobre a Competição</Text>
                        <Text style={styles.descriptionText}>
                            {competition.description || 'Sem descrição definida.'}
                        </Text>

                        <View style={styles.joinStatsRow}>
                            <View style={styles.joinStat}>
                                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                                <Text style={styles.joinStatLabel}>Início: {startDate.toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.joinStat}>
                                <Ionicons name="flag-outline" size={20} color="#6b7280" />
                                <Text style={styles.joinStatLabel}>Fim: {endDate.toLocaleDateString()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Prize */}
                    {competition.prize_description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>🏆 Premiação</Text>
                            <Text style={styles.prizeText}>{competition.prize_description}</Text>
                        </View>
                    )}

                    {/* Current Participants Preview */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.sectionHeader}>Junte-se a eles ({participants.length || leaderboard.length})</Text>
                        </View>
                        <View style={styles.participantsPreview}>
                            {leaderboard.length > 0 ? (
                                leaderboard.slice(0, 5).map((entry: any) => (
                                    <View key={entry.user_id} style={styles.previewAvatar}>
                                        <Text style={styles.previewAvatarText}>
                                            {entry.user_name ? entry.user_name.charAt(0).toUpperCase() : '?'}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                participants.slice(0, 5).map((p: any) => (
                                    <View key={p.id} style={styles.previewAvatar}>
                                        <Text style={styles.previewAvatarText}>?</Text>
                                    </View>
                                ))
                            )}

                            {leaderboard.length > 5 && (
                                <View style={[styles.previewAvatar, styles.previewMore]}>
                                    <Text style={styles.previewMoreText}>+{leaderboard.length - 5}</Text>
                                </View>
                            )}
                            {participants.length === 0 && (
                                <Text style={styles.emptyText}>Seja o primeiro a entrar!</Text>
                            )}
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.joinButton, joining && styles.buttonDisabled]}
                        onPress={handleJoin}
                        disabled={joining}
                    >
                        {joining ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.joinButtonText}>Participar Agora</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handleLeave = async () => {
        if (!user || !competition) return;

        const performLeave = async () => {
            try {
                setLoading(true);
                await competitionService.leaveCompetition(competition.id, user.id);
                router.back();
            } catch (error: any) {
                console.error(error);
                if (Platform.OS === 'web') {
                    alert('Erro: Não foi possível sair da competição.');
                } else {
                    Alert.alert('Erro', 'Não foi possível sair da competição.');
                }
                setLoading(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Sair do Desafio?\n\nTem certeza que deseja sair? Todo seu histórico e pontos nesta competição serão removidos.')) {
                performLeave();
            }
        } else {
            Alert.alert(
                'Sair do Desafio',
                'Tem certeza que deseja sair? Todo seu histórico e pontos nesta competição serão removidos.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Sair do Desafio',
                        style: 'destructive',
                        onPress: performLeave
                    }
                ]
            );
        }
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/competitions');
        }
    };

    // EXISTING PARTICIPANT VIEW
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{competition.name}</Text>
                <TouchableOpacity onPress={handleSharePress} style={styles.menuButton}>
                    <Ionicons name="share-social-outline" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Competition Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <View>
                            <Text style={styles.compName}>{competition.name}</Text>
                            <View style={[styles.statusBadge, isActive && styles.statusActive, isEnded && styles.statusEnded]}>
                                <Text style={styles.statusText}>
                                    {isActive ? 'EM ANDAMENTO' : isEnded ? 'ENCERRADA' : competition.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {competition.description && (
                        <Text style={styles.description}>{competition.description}</Text>
                    )}

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                            <Text style={styles.statValue}>
                                {Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                            </Text>
                            <Text style={styles.statLabel}>Restantes</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Ionicons name="people-outline" size={18} color="#6b7280" />
                            <Text style={styles.statValue}>{leaderboard.length}</Text>
                            <Text style={styles.statLabel}>Participantes</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Ionicons name="trophy-outline" size={18} color="#6b7280" />
                            <Text style={styles.statValue}>
                                {competition.scoring_rule === 'total_checkins' ? 'Check-ins' :
                                    competition.scoring_rule === 'streak_days' ? 'Streak' : 'Acad.'}
                            </Text>
                            <Text style={styles.statLabel}>Regra</Text>
                        </View>
                    </View>
                </View>

                {/* My Rank Card */}
                {userRank && (
                    <View style={styles.myRankCard}>
                        <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>#{userRank.rank}</Text>
                        </View>
                        <View style={styles.myRankInfo}>
                            <Text style={styles.myRankTitle}>Seu Desempenho</Text>
                            <Text style={styles.myRankScore}>{userRank.score} pontos</Text>
                        </View>
                    </View>
                )}

                {/* Leaderboard */}
                <Text style={styles.sectionTitle}>Ranking</Text>
                <View style={styles.leaderboardContainer}>
                    {leaderboard.map((entry, index) => (
                        <View key={entry.user_id} style={[styles.rankItem, entry.user_id === user?.id && styles.rankItemHighlight]}>
                            <View style={styles.rankPosition}>
                                {index < 3 ? (
                                    <Ionicons
                                        name="trophy"
                                        size={24}
                                        color={index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#b45309'}
                                    />
                                ) : (
                                    <Text style={styles.rankNumber}>{entry.rank}</Text>
                                )}
                            </View>

                            <View style={styles.rankUser}>
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitial}>
                                        {entry.user_name ? entry.user_name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.userName} numberOfLines={1}>
                                        {entry.user_name || 'Usuário'}
                                    </Text>
                                    <Text style={styles.userEmail} numberOfLines={1}>
                                        {entry.total_checkins} check-ins • {entry.current_streak} dias seguidos
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.rankScore}>{entry.score}</Text>
                        </View>
                    ))}

                    {leaderboard.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Ainda não há pontuações registradas.</Text>
                        </View>
                    )}
                </View>

                {/* Leave Button */}
                <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="exit-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                        <Text style={styles.leaveButtonText}>Sair do Desafio</Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>

            {/* Share Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={shareModalVisible}
                onRequestClose={() => setShareModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Convidar Amigos</Text>
                            <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDescription}>
                            Compartilhe este link para convidar pessoas para a competição. Elas entrarão automaticamente ao clicar.
                        </Text>

                        <View style={styles.linkContainer}>
                            <Text style={styles.linkText} numberOfLines={1}>
                                {deepLink}
                            </Text>
                            <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={20} color="#2563eb" />
                            </TouchableOpacity>
                        </View>
                        {copied && <Text style={styles.copiedText}>Copiado!</Text>}

                        <TouchableOpacity style={styles.nativeShareButton} onPress={handleNativeShare}>
                            <Ionicons name="share-outline" size={20} color="#fff" />
                            <Text style={styles.nativeShareText}>Compartilhar via...</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    // ... [EXISTING STYLES] ...

    // ADDED BUTTON STYLES
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee2e2',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    leaveButtonText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // ... [REST OF EXISTING STYLES] ...
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        textAlign: 'center',
    },
    menuButton: {
        padding: 8,
    },
    content: {
        padding: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
    },
    infoCard: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    infoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    compName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#dbeafe',
        marginBottom: 20,
        lineHeight: 20,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statusActive: {
        backgroundColor: '#dcfce7',
    },
    statusEnded: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#064e3b',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 12,
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    statLabel: {
        fontSize: 11,
        color: '#dbeafe',
    },
    divider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    myRankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    rankBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankBadgeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    myRankInfo: {
        flex: 1,
    },
    myRankTitle: {
        fontSize: 14,
        color: '#6b7280',
    },
    myRankScore: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    leaderboardContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 32,
    },
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    rankItemHighlight: {
        backgroundColor: '#eff6ff',
    },
    rankPosition: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    rankNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    rankUser: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    userEmail: {
        fontSize: 12,
        color: '#6b7280',
    },
    rankScore: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 300,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
        lineHeight: 20,
    },
    linkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    linkText: {
        flex: 1,
        fontSize: 14,
        color: '#374151',
        marginRight: 12,
    },
    copyButton: {
        padding: 8,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
    },
    copiedText: {
        color: '#16a34a',
        fontSize: 12,
        fontWeight: 'bold',
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginRight: 4,
    },
    nativeShareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    nativeShareText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    joinHero: {
        alignItems: 'center',
        marginBottom: 32,
        padding: 24,
    },
    joinIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    joinTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    joinSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 0,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    descriptionText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 22,
        marginBottom: 16,
    },
    joinStatsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    joinStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    joinStatLabel: {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: '500',
    },
    prizeText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    participantsPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    previewAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: -8,
        borderWidth: 2,
        borderColor: '#fff',
    },
    previewAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    previewMore: {
        backgroundColor: '#f3f4f6',
        zIndex: 10,
    },
    previewMoreText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    joinButton: {
        flexDirection: 'row',
        backgroundColor: '#2563eb',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    joinButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});
