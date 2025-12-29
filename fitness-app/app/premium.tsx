import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface PremiumFeature {
    icon: string;
    title: string;
    description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
    {
        icon: '🔥',
        title: 'Check-ins Ilimitados',
        description: 'Treine em quantas academias quiser, sem limites'
    },
    {
        icon: '💎',
        title: 'Badges Exclusivas',
        description: 'Conquiste badges premium únicas'
    },
    {
        icon: '📊',
        title: 'Estatísticas Avançadas',
        description: 'Análises detalhadas do seu progresso'
    },
    {
        icon: '🏆',
        title: 'Ranking Global',
        description: 'Participe do ranking mundial de atletas'
    },
    {
        icon: '🎯',
        title: 'Missões Semanais Bônus',
        description: 'Desafios extras com recompensas maiores'
    },
    {
        icon: '🎫',
        title: 'Convites Especiais',
        description: 'Acesso a eventos e workshops exclusivos'
    },
    {
        icon: '🎁',
        title: 'Marketplace Premium',
        description: 'Descontos exclusivos em produtos e serviços'
    },
    {
        icon: '⚡',
        title: 'Sem Anúncios',
        description: 'Experiência premium sem interrupções'
    }
];

interface PremiumModalProps {
    visible: boolean;
    onClose: () => void;
}

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const plans = {
        monthly: {
            price: 12.90,
            period: 'mês',
            savings: null
        },
        yearly: {
            price: 129.00,
            period: 'ano',
            savings: 'Economize 17%'
        }
    };

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Erro', 'Você precisa estar logado');
                return;
            }

            // Aqui você integraria com Stripe
            // Por enquanto, vamos simular
            Alert.alert(
                '🎉 Bem-vindo ao Premium!',
                'Sua assinatura foi ativada com sucesso!',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            onClose();
                            router.push('/profile/progress' as any);
                        }
                    }
                ]
            );

            // Criar assinatura no banco
            await supabase.from('user_subscriptions').insert({
                user_id: user.id,
                plan_type: selectedPlan === 'monthly' ? 'user_monthly' : 'user_yearly',
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + (selectedPlan === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString()
            });

        } catch (error) {
            console.error('Error subscribing:', error);
            Alert.alert('Erro', 'Não foi possível processar sua assinatura');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="#111827" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.badge}>💎 PREMIUM</Text>
                        <Text style={styles.title}>Desbloqueie Todo{'\n'}o Potencial</Text>
                        <Text style={styles.subtitle}>
                            Leve seus treinos para o próximo nível com recursos exclusivos
                        </Text>
                    </View>

                    {/* Plan Selector */}
                    <View style={styles.planSelector}>
                        <TouchableOpacity
                            style={[
                                styles.planOption,
                                selectedPlan === 'monthly' && styles.planOptionActive
                            ]}
                            onPress={() => setSelectedPlan('monthly')}
                        >
                            <View style={styles.planHeader}>
                                <Text style={[
                                    styles.planName,
                                    selectedPlan === 'monthly' && styles.planNameActive
                                ]}>
                                    Mensal
                                </Text>
                                {selectedPlan === 'monthly' && (
                                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                                )}
                            </View>
                            <Text style={[
                                styles.planPrice,
                                selectedPlan === 'monthly' && styles.planPriceActive
                            ]}>
                                R$ {plans.monthly.price.toFixed(2)}
                            </Text>
                            <Text style={styles.planPeriod}>por mês</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.planOption,
                                selectedPlan === 'yearly' && styles.planOptionActive
                            ]}
                            onPress={() => setSelectedPlan('yearly')}
                        >
                            {plans.yearly.savings && (
                                <View style={styles.savingsBadge}>
                                    <Text style={styles.savingsText}>{plans.yearly.savings}</Text>
                                </View>
                            )}
                            <View style={styles.planHeader}>
                                <Text style={[
                                    styles.planName,
                                    selectedPlan === 'yearly' && styles.planNameActive
                                ]}>
                                    Anual
                                </Text>
                                {selectedPlan === 'yearly' && (
                                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                                )}
                            </View>
                            <Text style={[
                                styles.planPrice,
                                selectedPlan === 'yearly' && styles.planPriceActive
                            ]}>
                                R$ {plans.yearly.price.toFixed(2)}
                            </Text>
                            <Text style={styles.planPeriod}>por ano</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Features */}
                    <View style={styles.features}>
                        <Text style={styles.featuresTitle}>O que você ganha:</Text>
                        {PREMIUM_FEATURES.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                                <Text style={styles.featureIcon}>{feature.icon}</Text>
                                <View style={styles.featureContent}>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                    <Text style={styles.featureDescription}>{feature.description}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Testimonial */}
                    <View style={styles.testimonial}>
                        <Text style={styles.testimonialText}>
                            "O Premium transformou minha rotina de treinos. Agora tenho acesso a todas as academias e consigo acompanhar meu progresso de forma profissional!"
                        </Text>
                        <Text style={styles.testimonialAuthor}>— Maria Silva, usuária Premium</Text>
                    </View>

                    {/* FAQ */}
                    <View style={styles.faq}>
                        <Text style={styles.faqTitle}>Perguntas Frequentes</Text>
                        <View style={styles.faqItem}>
                            <Text style={styles.faqQuestion}>Posso cancelar a qualquer momento?</Text>
                            <Text style={styles.faqAnswer}>Sim! Você pode cancelar quando quiser, sem multas.</Text>
                        </View>
                        <View style={styles.faqItem}>
                            <Text style={styles.faqQuestion}>Tem período de teste?</Text>
                            <Text style={styles.faqAnswer}>Sim! 7 dias grátis para você experimentar.</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* CTA Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
                        onPress={handleSubscribe}
                        disabled={loading}
                    >
                        <Text style={styles.ctaButtonText}>
                            {loading ? 'Processando...' : 'Começar Teste Grátis'}
                        </Text>
                        <Text style={styles.ctaButtonSubtext}>
                            7 dias grátis, depois R$ {plans[selectedPlan].price.toFixed(2)}/{selectedPlan === 'monthly' ? 'mês' : 'ano'}
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.terms}>
                        Ao continuar, você concorda com nossos Termos de Uso
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

export default function PremiumScreen() {
    const [modalVisible, setModalVisible] = useState(true);
    const router = useRouter();

    return (
        <PremiumModal
            visible={modalVisible}
            onClose={() => {
                setModalVisible(false);
                router.back();
            }}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        paddingTop: 60,
    },
    closeButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    hero: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    badge: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7C3AED',
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 42,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    planSelector: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 32,
    },
    planOption: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        position: 'relative',
    },
    planOptionActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
    },
    savingsBadge: {
        position: 'absolute',
        top: -10,
        right: 12,
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    savingsText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
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
        color: '#6B7280',
    },
    planNameActive: {
        color: '#111827',
    },
    planPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#6B7280',
        marginBottom: 4,
    },
    planPriceActive: {
        color: '#3B82F6',
    },
    planPeriod: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    features: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    featuresTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    featureIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    testimonial: {
        backgroundColor: '#F9FAFB',
        marginHorizontal: 24,
        padding: 20,
        borderRadius: 16,
        marginBottom: 32,
    },
    testimonialText: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    testimonialAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    faq: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    faqTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    faqItem: {
        marginBottom: 16,
    },
    faqQuestion: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    faqAnswer: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    ctaButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    ctaButtonDisabled: {
        opacity: 0.6,
    },
    ctaButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    ctaButtonSubtext: {
        fontSize: 12,
        color: '#DBEAFE',
    },
    terms: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
