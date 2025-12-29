import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Modal,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Benefit {
    id: string;
    title: string;
    description: string;
    category: string;
    image_url: string;
    coupon_code: string;
    discount_value: string;
    quantity_limit: number;
    quantity_used: number;
    is_premium_only: boolean;
    academy_id: string;
    academies?: {
        name: string;
    };
}

const CATEGORIES = [
    { value: 'all', label: 'Todos', icon: '🎁' },
    { value: 'supplements', label: 'Suplementos', icon: '💊' },
    { value: 'clothing', label: 'Roupas', icon: '👕' },
    { value: 'food', label: 'Alimentação', icon: '🥗' },
    { value: 'wellness', label: 'Bem-estar', icon: '🧘' },
    { value: 'recovery', label: 'Recuperação', icon: '💆' },
    { value: 'personal_care', label: 'Cuidados', icon: '🧴' }
];

export default function BenefitsScreen() {
    const [benefits, setBenefits] = useState<Benefit[]>([]);
    const [filteredBenefits, setFilteredBenefits] = useState<Benefit[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchBenefits();
        checkPremiumStatus();
    }, []);

    useEffect(() => {
        filterBenefits();
    }, [benefits, selectedCategory, searchQuery, isPremium]);

    const checkPremiumStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase.rpc('is_user_premium', { p_user_id: user.id });
            setIsPremium(data || false);
        } catch (error) {
            console.error('Error checking premium status:', error);
        }
    };

    const fetchBenefits = async () => {
        try {
            const { data, error } = await supabase
                .from('marketplace_benefits')
                .select('*, academies(name)')
                .eq('is_active', true)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBenefits(data || []);
        } catch (error) {
            console.error('Error fetching benefits:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterBenefits = () => {
        let filtered = benefits;

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(b => b.category === selectedCategory);
        }

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(b =>
                b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by premium (show all if premium, hide premium-only if not)
        if (!isPremium) {
            filtered = filtered.filter(b => !b.is_premium_only);
        }

        setFilteredBenefits(filtered);
    };

    const handleBenefitPress = (benefit: Benefit) => {
        if (benefit.is_premium_only && !isPremium) {
            Alert.alert(
                '💎 Benefício Premium',
                'Este benefício está disponível apenas para usuários Premium. Deseja fazer upgrade?',
                [
                    { text: 'Agora não', style: 'cancel' },
                    { text: 'Ver Premium', onPress: () => router.push('/premium' as any) }
                ]
            );
            return;
        }

        setSelectedBenefit(benefit);
        setShowModal(true);
    };

    const handleActivateBenefit = () => {
        if (!selectedBenefit) return;

        Alert.alert(
            '✅ Benefício Ativado!',
            selectedBenefit.coupon_code
                ? `Use o cupom: ${selectedBenefit.coupon_code}`
                : `Desconto: ${selectedBenefit.discount_value}`,
            [{ text: 'OK', onPress: () => setShowModal(false) }]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando benefícios...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🎁 Marketplace</Text>
                <Text style={styles.headerSubtitle}>Benefícios exclusivos para você</Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar benefícios..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesContainer}
                contentContainerStyle={styles.categoriesContent}
            >
                {CATEGORIES.map((category) => (
                    <TouchableOpacity
                        key={category.value}
                        style={[
                            styles.categoryChip,
                            selectedCategory === category.value && styles.categoryChipActive
                        ]}
                        onPress={() => setSelectedCategory(category.value)}
                    >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text
                            style={[
                                styles.categoryLabel,
                                selectedCategory === category.value && styles.categoryLabelActive
                            ]}
                        >
                            {category.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Benefits List */}
            <ScrollView
                style={styles.benefitsList}
                contentContainerStyle={styles.benefitsContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredBenefits.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>Nenhum benefício encontrado</Text>
                        <Text style={styles.emptySubtitle}>Tente buscar por outra categoria</Text>
                    </View>
                ) : (
                    filteredBenefits.map((benefit) => (
                        <TouchableOpacity
                            key={benefit.id}
                            style={styles.benefitCard}
                            onPress={() => handleBenefitPress(benefit)}
                        >
                            {/* Image */}
                            <View style={styles.benefitImageContainer}>
                                {benefit.image_url ? (
                                    <Image source={{ uri: benefit.image_url }} style={styles.benefitImage} />
                                ) : (
                                    <View style={styles.benefitImagePlaceholder}>
                                        <Ionicons name="gift" size={40} color="#9CA3AF" />
                                    </View>
                                )}
                                {benefit.is_premium_only && (
                                    <View style={styles.premiumBadge}>
                                        <Text style={styles.premiumBadgeText}>💎 Premium</Text>
                                    </View>
                                )}
                            </View>

                            {/* Content */}
                            <View style={styles.benefitContent}>
                                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                                <Text style={styles.benefitDescription} numberOfLines={2}>
                                    {benefit.description}
                                </Text>

                                <View style={styles.benefitFooter}>
                                    <View style={styles.discountBadge}>
                                        <Text style={styles.discountText}>{benefit.discount_value}</Text>
                                    </View>
                                    {benefit.academies && (
                                        <Text style={styles.academyName} numberOfLines={1}>
                                            {benefit.academies.name}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Benefit Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowModal(false)}
                        >
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>

                        {selectedBenefit && (
                            <>
                                {selectedBenefit.image_url && (
                                    <Image
                                        source={{ uri: selectedBenefit.image_url }}
                                        style={styles.modalImage}
                                    />
                                )}

                                <Text style={styles.modalTitle}>{selectedBenefit.title}</Text>
                                <Text style={styles.modalDescription}>{selectedBenefit.description}</Text>

                                <View style={styles.modalDetails}>
                                    <View style={styles.modalDetailRow}>
                                        <Text style={styles.modalDetailLabel}>Desconto:</Text>
                                        <Text style={styles.modalDetailValue}>{selectedBenefit.discount_value}</Text>
                                    </View>

                                    {selectedBenefit.coupon_code && (
                                        <View style={styles.modalDetailRow}>
                                            <Text style={styles.modalDetailLabel}>Cupom:</Text>
                                            <View style={styles.couponCode}>
                                                <Text style={styles.couponCodeText}>{selectedBenefit.coupon_code}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {selectedBenefit.quantity_limit > 0 && (
                                        <View style={styles.modalDetailRow}>
                                            <Text style={styles.modalDetailLabel}>Disponível:</Text>
                                            <Text style={styles.modalDetailValue}>
                                                {selectedBenefit.quantity_limit - selectedBenefit.quantity_used} restantes
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.activateButton}
                                    onPress={handleActivateBenefit}
                                >
                                    <Text style={styles.activateButtonText}>Ativar Benefício</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#111827',
    },
    categoriesContainer: {
        maxHeight: 50,
    },
    categoriesContent: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    categoryChipActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    categoryIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    categoryLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    categoryLabelActive: {
        color: '#FFFFFF',
    },
    benefitsList: {
        flex: 1,
    },
    benefitsContent: {
        padding: 20,
    },
    benefitCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    benefitImageContainer: {
        position: 'relative',
        height: 180,
        backgroundColor: '#F3F4F6',
    },
    benefitImage: {
        width: '100%',
        height: '100%',
    },
    benefitImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    premiumBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#92400E',
    },
    benefitContent: {
        padding: 16,
    },
    benefitTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 6,
    },
    benefitDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
        lineHeight: 20,
    },
    benefitFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    discountBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    discountText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#065F46',
    },
    academyName: {
        flex: 1,
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 12,
        textAlign: 'right',
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
    modalClose: {
        alignSelf: 'flex-end',
        padding: 8,
    },
    modalImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 24,
    },
    modalDetails: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    modalDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalDetailLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    modalDetailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    couponCode: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    couponCodeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E40AF',
        fontFamily: 'monospace',
    },
    activateButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    activateButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
