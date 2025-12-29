import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, RefreshControl, Clipboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../hooks/useAuthStore';
import { referralService, ReferralStats, ReferralReward } from '../../services/referralService';

export default function ReferralsScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [referralCode, setReferralCode] = useState('');
    const [referralLink, setReferralLink] = useState('');
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [rewards, setRewards] = useState<ReferralReward[]>([]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const [code, link, statsData, rewardsData] = await Promise.all([
                referralService.getMyReferralCode(user.id),
                referralService.getReferralLink(user.id),
                referralService.getMyStats(user.id),
                referralService.getMyRewards(user.id)
            ]);

            setReferralCode(code);
            setReferralLink(link);
            setStats(statsData);
            setRewards(rewardsData);
        } catch (error) {
            console.error('Erro ao carregar dados de convites:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleCopyCode = () => {
        Clipboard.setString(referralCode);
        alert('Código copiado!');
    };

    const handleCopyLink = () => {
        Clipboard.setString(referralLink);
        alert('Link copiado!');
    };

    const handleShare = async () => {
        try {
            const shareText = await referralService.getShareText(user!.id);
            await Share.share({
                message: shareText
            });
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
        }
    };

    const pendingRewards = rewards.filter(r => r.status === 'pending');
    const appliedRewards = rewards.filter(r => r.status === 'applied');

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#2563eb" />}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Indique e Ganhe</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
                <View style={styles.heroIcon}>
                    <Ionicons name="gift" size={48} color="#2563eb" />
                </View>
                <Text style={styles.heroTitle}>Ganhe 10% de desconto</Text>
                <Text style={styles.heroSubtitle}>
                    Para cada amigo que assinar, você ganha 10% de desconto na próxima mensalidade!
                </Text>
            </View>

            {/* Código de Convite */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Seu código de convite</Text>
                <View style={styles.codeCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.codeLabel}>CÓDIGO</Text>
                        <Text style={styles.codeValue}>{referralCode}</Text>
                    </View>
                    <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                        <Ionicons name="copy-outline" size={20} color="#2563eb" />
                    </TouchableOpacity>
                </View>

                <View style={styles.linkCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.linkLabel}>LINK DE CONVITE</Text>
                        <Text style={styles.linkValue} numberOfLines={1}>{referralLink}</Text>
                    </View>
                    <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                        <Ionicons name="copy-outline" size={20} color="#2563eb" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Ionicons name="share-social" size={20} color="white" />
                    <Text style={styles.shareButtonText}>Compartilhar Convite</Text>
                </TouchableOpacity>
            </View>

            {/* Estatísticas */}
            {stats && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Suas estatísticas</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="people" size={24} color="#2563eb" />
                            <Text style={styles.statValue}>{stats.total_invites}</Text>
                            <Text style={styles.statLabel}>Convites Enviados</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                            <Text style={styles.statValue}>{stats.converted_invites}</Text>
                            <Text style={styles.statLabel}>Convertidos</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="gift" size={24} color="#f59e0b" />
                            <Text style={styles.statValue}>{stats.pending_rewards}</Text>
                            <Text style={styles.statLabel}>Descontos Disponíveis</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="cash" size={24} color="#10b981" />
                            <Text style={styles.statValue}>R$ {stats.total_saved.toFixed(2)}</Text>
                            <Text style={styles.statLabel}>Total Economizado</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Descontos Disponíveis */}
            {pendingRewards.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Descontos disponíveis</Text>
                    {pendingRewards.map(reward => (
                        <View key={reward.id} style={styles.rewardCard}>
                            <View style={styles.rewardIcon}>
                                <Ionicons name="ticket" size={24} color="#2563eb" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rewardTitle}>{reward.discount_percentage}% de desconto</Text>
                                <Text style={styles.rewardSubtitle}>
                                    Válido até {new Date(reward.expires_at!).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>
                            <View style={styles.rewardBadge}>
                                <Text style={styles.rewardBadgeText}>DISPONÍVEL</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Histórico de Descontos Aplicados */}
            {appliedRewards.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Descontos aplicados</Text>
                    {appliedRewards.map(reward => (
                        <View key={reward.id} style={[styles.rewardCard, styles.rewardCardApplied]}>
                            <View style={styles.rewardIcon}>
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rewardTitle}>
                                    {reward.discount_percentage}% de desconto
                                </Text>
                                <Text style={styles.rewardSubtitle}>
                                    Economizou R$ {reward.discount_amount?.toFixed(2)}
                                </Text>
                                <Text style={styles.rewardDate}>
                                    Aplicado em {new Date(reward.applied_at!).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Como Funciona */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Como funciona?</Text>
                <View style={styles.howItWorks}>
                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>1</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>Compartilhe seu código</Text>
                            <Text style={styles.stepText}>
                                Envie seu código ou link para amigos e familiares
                            </Text>
                        </View>
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>2</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>Seu amigo assina</Text>
                            <Text style={styles.stepText}>
                                Quando ele criar conta e assinar um plano
                            </Text>
                        </View>
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>3</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stepTitle}>Você ganha 10% OFF</Text>
                            <Text style={styles.stepText}>
                                O desconto é aplicado automaticamente na próxima mensalidade
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
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
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    hero: {
        backgroundColor: '#ffffff',
        padding: 32,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    heroIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    codeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#2563eb',
        borderStyle: 'dashed',
    },
    codeLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 4,
    },
    codeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2563eb',
        letterSpacing: 2,
    },
    linkCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    linkLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 4,
    },
    linkValue: {
        fontSize: 12,
        color: '#2563eb',
    },
    copyButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 4,
    },
    rewardCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rewardCardApplied: {
        opacity: 0.7,
    },
    rewardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rewardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    rewardSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },
    rewardDate: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 4,
    },
    rewardBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    rewardBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#10b981',
    },
    howItWorks: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
    },
    step: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    stepText: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
});
