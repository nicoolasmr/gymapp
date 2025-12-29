import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface Challenge {
    id: string;
    challenger_id: string;
    opponent_id: string;
    status: string;
    type: string;
    start_date: string;
    end_date: string;
    challenger_score: number;
    opponent_score: number;
    winner_id: string | null;
}

const CHALLENGE_TYPES = [
    { value: 'checkins', label: 'Mais Check-ins', icon: '✅', description: 'Quem fizer mais check-ins' },
    { value: 'streak', label: 'Maior Streak', icon: '🔥', description: 'Quem mantiver maior sequência' },
    { value: 'modalities', label: 'Mais Modalidades', icon: '💪', description: 'Quem treinar mais modalidades' },
    { value: 'monthly', label: 'Desafio Mensal', icon: '📅', description: 'Competição do mês' },
];

export default function ChallengesScreen() {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedType, setSelectedType] = useState('checkins');
    const [opponentUsername, setOpponentUsername] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('pvp_challenges')
                .select('*')
                .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChallenges(data || []);
        } catch (error) {
            console.error('Error fetching challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    const createChallenge = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find opponent by username
            const { data: opponent } = await supabase
                .from('user_profiles_public')
                .select('user_id')
                .eq('username', opponentUsername)
                .single();

            if (!opponent) {
                alert('Usuário não encontrado!');
                return;
            }

            // Create challenge
            const { error } = await supabase
                .from('pvp_challenges')
                .insert({
                    challenger_id: user.id,
                    opponent_id: opponent.user_id,
                    type: selectedType,
                    status: 'pending',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });

            if (error) throw error;

            setShowCreateModal(false);
            setOpponentUsername('');
            fetchChallenges();
            alert('Desafio enviado!');
        } catch (error) {
            console.error('Error creating challenge:', error);
            alert('Erro ao criar desafio');
        }
    };

    const acceptChallenge = async (challengeId: string) => {
        try {
            const { error } = await supabase
                .from('pvp_challenges')
                .update({ status: 'active', start_date: new Date().toISOString().split('T')[0] })
                .eq('id', challengeId);

            if (error) throw error;
            fetchChallenges();
        } catch (error) {
            console.error('Error accepting challenge:', error);
        }
    };

    const declineChallenge = async (challengeId: string) => {
        try {
            const { error } = await supabase
                .from('pvp_challenges')
                .update({ status: 'declined' })
                .eq('id', challengeId);

            if (error) throw error;
            fetchChallenges();
        } catch (error) {
            console.error('Error declining challenge:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#F59E0B';
            case 'active': return '#10B981';
            case 'finished': return '#6B7280';
            case 'declined': return '#EF4444';
            default: return '#9CA3AF';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'active': return 'Ativo';
            case 'finished': return 'Finalizado';
            case 'declined': return 'Recusado';
            default: return status;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando desafios...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>⚔️ Desafios PVP</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
                {challenges.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>⚔️</Text>
                        <Text style={styles.emptyTitle}>Nenhum desafio</Text>
                        <Text style={styles.emptySubtitle}>
                            Crie um desafio e compita com seus amigos!
                        </Text>
                    </View>
                ) : (
                    challenges.map((challenge) => (
                        <View key={challenge.id} style={styles.challengeCard}>
                            {/* Status Badge */}
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(challenge.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(challenge.status) }]}>
                                    {getStatusLabel(challenge.status)}
                                </Text>
                            </View>

                            {/* Challenge Type */}
                            <Text style={styles.challengeType}>
                                {CHALLENGE_TYPES.find(t => t.value === challenge.type)?.icon}{' '}
                                {CHALLENGE_TYPES.find(t => t.value === challenge.type)?.label}
                            </Text>

                            {/* Score */}
                            <View style={styles.scoreContainer}>
                                <View style={styles.scoreItem}>
                                    <Text style={styles.scoreLabel}>Você</Text>
                                    <Text style={styles.scoreValue}>{challenge.challenger_score}</Text>
                                </View>
                                <Text style={styles.scoreVs}>VS</Text>
                                <View style={styles.scoreItem}>
                                    <Text style={styles.scoreLabel}>Oponente</Text>
                                    <Text style={styles.scoreValue}>{challenge.opponent_score}</Text>
                                </View>
                            </View>

                            {/* Dates */}
                            <Text style={styles.challengeDates}>
                                {new Date(challenge.start_date).toLocaleDateString('pt-BR')} - {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
                            </Text>

                            {/* Actions */}
                            {challenge.status === 'pending' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.acceptButton]}
                                        onPress={() => acceptChallenge(challenge.id)}
                                    >
                                        <Text style={styles.actionButtonText}>Aceitar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.declineButton]}
                                        onPress={() => declineChallenge(challenge.id)}
                                    >
                                        <Text style={styles.actionButtonText}>Recusar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Create Challenge Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Criar Desafio</Text>

                        {/* Challenge Type Selection */}
                        <Text style={styles.modalLabel}>Tipo de Desafio</Text>
                        {CHALLENGE_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.value}
                                style={[
                                    styles.typeOption,
                                    selectedType === type.value && styles.typeOptionSelected
                                ]}
                                onPress={() => setSelectedType(type.value)}
                            >
                                <Text style={styles.typeIcon}>{type.icon}</Text>
                                <View style={styles.typeInfo}>
                                    <Text style={styles.typeLabel}>{type.label}</Text>
                                    <Text style={styles.typeDescription}>{type.description}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Opponent Username */}
                        <Text style={styles.modalLabel}>Username do Oponente</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="@username"
                            value={opponentUsername}
                            onChangeText={setOpponentUsername}
                            autoCapitalize="none"
                        />

                        {/* Buttons */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={createChallenge}
                            >
                                <Text style={styles.confirmButtonText}>Criar Desafio</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    createButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    contentPadding: {
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
    challengeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    challengeType: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingVertical: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
    },
    scoreItem: {
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
    },
    scoreVs: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#9CA3AF',
    },
    challengeDates: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#10B981',
    },
    declineButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 24,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 16,
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        marginBottom: 12,
    },
    typeOptionSelected: {
        borderColor: '#8B5CF6',
        backgroundColor: '#8B5CF6' + '10',
    },
    typeIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    typeInfo: {
        flex: 1,
    },
    typeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    typeDescription: {
        fontSize: 12,
        color: '#6B7280',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    confirmButton: {
        backgroundColor: '#8B5CF6',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
