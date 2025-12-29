import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { referralService, Referral } from '../../services/referralService';
import { useAuthStore } from '../../hooks/useAuthStore';

export default function ReferralScreen() {
    const { user } = useAuthStore();

    const [code, setCode] = useState<string | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [myCode, myReferrals] = await Promise.all([
                referralService.getMyReferralCode(user.id),
                referralService.getMyReferrals()
            ]);
            setCode(myCode);
            setReferrals(myReferrals || []);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os dados de indicação.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!code) return;
        try {
            const message = await referralService.getShareText(code);
            await Share.share({ message });
        } catch (error) {
            console.error(error);
        }
    };

    const handleCopy = async () => {
        if (!code) return;
        await Clipboard.setStringAsync(code);
        Alert.alert('Copiado!', 'Código copiado para a área de transferência.');
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.iconBg}>
                    <Ionicons name="gift" size={48} color="#6366F1" />
                </View>
                <Text style={styles.title}>Indique e Ganhe</Text>
                <Text style={styles.subtitle}>
                    Convide amigos e ambos ganham <Text style={styles.highlight}>10% de desconto</Text> na próxima mensalidade!
                </Text>
            </View>

            <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>SEU CÓDIGO EXCLUSIVO</Text>
                <TouchableOpacity style={styles.codeBox} onPress={handleCopy}>
                    <Text style={styles.codeText}>{code}</Text>
                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Text style={styles.shareText}>Compartilhar Agora</Text>
                    <Ionicons name="share-social-outline" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Seus Convites ({referrals.length})</Text>
                {referrals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={32} color="#D1D5DB" />
                        <Text style={styles.emptyText}>Você ainda não convidou ninguém.</Text>
                    </View>
                ) : (
                    referrals.map((item) => (
                        <View key={item.id} style={styles.referralItem}>
                            <View>
                                <Text style={styles.referralStatus}>
                                    {item.status === 'signed_up' ? 'Cadastrou' :
                                        item.status === 'paid' ? 'Pagou (Recompensa Ativa)' :
                                            'Convidado'}
                                </Text>
                                <Text style={styles.referralDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                            </View>
                            <Ionicons
                                name={item.status === 'paid' ? 'checkmark-circle' : 'time-outline'}
                                size={24}
                                color={item.status === 'paid' ? '#10B981' : '#F59E0B'}
                            />
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { padding: 24 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', marginBottom: 32 },
    iconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
    highlight: { color: '#6366F1', fontWeight: 'bold' },
    codeCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, alignItems: 'center', marginBottom: 32 },
    codeLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 },
    codeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginBottom: 24, width: '100%', justifyContent: 'center' },
    codeText: { fontSize: 24, fontWeight: 'bold', color: '#111827', letterSpacing: 2 },
    shareButton: { backgroundColor: '#6366F1', width: '100%', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    shareText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    statsContainer: {},
    statsTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 },
    emptyState: { alignItems: 'center', padding: 32, backgroundColor: '#FFF', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
    emptyText: { color: '#9CA3AF', marginTop: 8 },
    referralItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    referralStatus: { fontWeight: '600', color: '#374151' },
    referralDate: { fontSize: 12, color: '#9CA3AF' }
});
