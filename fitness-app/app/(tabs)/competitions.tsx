import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../hooks/useAuthStore';
import { competitionService, Competition } from '../../services/competitionService';

export default function CompetitionsScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'invited' | 'participating'>('my');

    const [myCompetitions, setMyCompetitions] = useState<Competition[]>([]);
    const [invitedCompetitions, setInvitedCompetitions] = useState<any[]>([]);
    const [participatingCompetitions, setParticipatingCompetitions] = useState<any[]>([]);

    const fetchData = async () => {
        if (!user) return;
        // Don't show full loading spinner on refresh, just use RefreshControl usually.
        // But for initial load or focus, maybe. Let's keep existing logic but be mindful.
        // setLoading(true); // Maybe avoid setting loading true on every focus to avoid flicker

        try {
            const [my, invited, participating] = await Promise.all([
                competitionService.getMyCompetitions(user.id),
                competitionService.getInvitedCompetitions(user.id),
                competitionService.getActiveParticipations(user.id)
            ]);

            setMyCompetitions(my);
            setInvitedCompetitions(invited);
            setParticipatingCompetitions(participating);
        } catch (error) {
            console.error('Erro ao carregar competições:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    const handleAcceptInvite = async (competitionId: string) => {
        if (!user) return;
        try {
            await competitionService.acceptInvite(competitionId, user.id);
            fetchData();
        } catch (error) {
            console.error('Erro ao aceitar convite:', error);
        }
    };

    const handleDeclineInvite = async (competitionId: string) => {
        if (!user) return;
        try {
            await competitionService.declineInvite(competitionId, user.id);
            fetchData();
        } catch (error) {
            console.error('Erro ao recusar convite:', error);
        }
    };

    const renderCompetitionCard = (competition: Competition, showActions = false, participantData?: any) => {
        const isActive = competition.status === 'active';
        const isEnded = competition.status === 'ended';
        const startDate = new Date(competition.start_date);
        const endDate = new Date(competition.end_date);

        return (
            <TouchableOpacity
                key={competition.id}
                style={[styles.card, isEnded && styles.cardEnded]}
                onPress={() => router.push(`/competitions/${competition.id}` as any)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{competition.name}</Text>
                        {competition.description && (
                            <Text style={styles.cardDescription} numberOfLines={2}>
                                {competition.description}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.statusBadge, isActive && styles.statusActive, isEnded && styles.statusEnded]}>
                        <Text style={styles.statusText}>
                            {isActive ? 'ATIVA' : isEnded ? 'ENCERRADA' : 'RASCUNHO'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                        <Text style={styles.infoText}>
                            {startDate.toLocaleDateString('pt-BR')} - {endDate.toLocaleDateString('pt-BR')}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="trophy-outline" size={16} color="#6b7280" />
                        <Text style={styles.infoText}>
                            {competition.scoring_rule === 'total_checkins' ? 'Total de Check-ins' :
                                competition.scoring_rule === 'streak_days' ? 'Dias Consecutivos' :
                                    'Academias Únicas'}
                        </Text>
                    </View>
                </View>

                {participantData && (
                    <View style={styles.scoreSection}>
                        <View style={styles.scoreItem}>
                            <Text style={styles.scoreLabel}>Posição</Text>
                            <Text style={styles.scoreValue}>#{participantData.rank || '-'}</Text>
                        </View>
                        <View style={styles.scoreItem}>
                            <Text style={styles.scoreLabel}>Pontos</Text>
                            <Text style={styles.scoreValue}>{participantData.score}</Text>
                        </View>
                        <View style={styles.scoreItem}>
                            <Text style={styles.scoreLabel}>Check-ins</Text>
                            <Text style={styles.scoreValue}>{participantData.total_checkins}</Text>
                        </View>
                    </View>
                )}

                {showActions && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleAcceptInvite(competition.id)}
                        >
                            <Text style={styles.actionButtonText}>Aceitar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={() => handleDeclineInvite(competition.id)}
                        >
                            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Recusar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Competições</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => router.push('/competitions/create' as any)}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my' && styles.tabActive]}
                    onPress={() => setActiveTab('my')}
                >
                    <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
                        Minhas ({myCompetitions.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'invited' && styles.tabActive]}
                    onPress={() => setActiveTab('invited')}
                >
                    <Text style={[styles.tabText, activeTab === 'invited' && styles.tabTextActive]}>
                        Convites ({invitedCompetitions.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'participating' && styles.tabActive]}
                    onPress={() => setActiveTab('participating')}
                >
                    <Text style={[styles.tabText, activeTab === 'participating' && styles.tabTextActive]}>
                        Participando ({participatingCompetitions.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#2563eb" />}
            >
                {activeTab === 'my' && (
                    <View style={styles.list}>
                        {myCompetitions.length > 0 ? (
                            myCompetitions.map(comp => renderCompetitionCard(comp))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="trophy-outline" size={64} color="#d1d5db" />
                                <Text style={styles.emptyTitle}>Nenhuma competição criada</Text>
                                <Text style={styles.emptyText}>Crie uma competição e desafie seus amigos!</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'invited' && (
                    <View style={styles.list}>
                        {invitedCompetitions.length > 0 ? (
                            invitedCompetitions.map(item => renderCompetitionCard(item.competitions, true))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="mail-outline" size={64} color="#d1d5db" />
                                <Text style={styles.emptyTitle}>Nenhum convite pendente</Text>
                                <Text style={styles.emptyText}>Você será notificado quando receber convites</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'participating' && (
                    <View style={styles.list}>
                        {participatingCompetitions.length > 0 ? (
                            participatingCompetitions.map(item =>
                                renderCompetitionCard(item.competitions, false, item)
                            )
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                                <Text style={styles.emptyTitle}>Você não está participando de nenhuma competição</Text>
                                <Text style={styles.emptyText}>Aceite um convite ou crie sua própria competição</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: 60,
        backgroundColor: '#ffffff',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    createButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#2563eb',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    tabTextActive: {
        color: '#2563eb',
    },
    content: {
        flex: 1,
    },
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
            web: {
                // @ts-ignore
                boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
            },
        }),
    },
    cardEnded: {
        opacity: 0.7,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#6b7280',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    statusActive: {
        backgroundColor: '#dcfce7',
    },
    statusEnded: {
        backgroundColor: '#fee2e2',
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    cardInfo: {
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    infoText: {
        fontSize: 13,
        color: '#6b7280',
    },
    scoreSection: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    scoreItem: {
        flex: 1,
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#2563eb',
    },
    declineButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
});
