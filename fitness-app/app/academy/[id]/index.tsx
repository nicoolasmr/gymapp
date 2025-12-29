import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AcademyDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [academy, setAcademy] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('about'); // about, schedule

    useEffect(() => {
        fetchAcademy();
    }, [id]);

    const fetchAcademy = async () => {
        try {
            const { data, error } = await supabase
                .from('academies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setAcademy(data);
        } catch (error) {
            console.error('Erro ao carregar academia:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = () => {
        // Passar dados da academia para a tela de check-in
        router.push({
            pathname: '/checkin',
            params: { academyId: id, academyName: academy?.name }
        } as any);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!academy) {
        return (
            <View style={styles.container}>
                <Text>Academia não encontrada.</Text>
            </View>
        );
    }

    const photos = academy.photos && academy.photos.length > 0
        ? academy.photos
        : ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'];

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header / Photos */}
                <View style={styles.imageContainer}>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {photos.map((photo: string, index: number) => (
                            <Image key={index} source={{ uri: photo }} style={styles.image} resizeMode="cover" />
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Dots Indicator */}
                    {photos.length > 1 && (
                        <View style={styles.dotsContainer}>
                            {photos.map((_: any, i: number) => (
                                <View key={i} style={[styles.dot, i === 0 && styles.activeDot]} />
                            ))}
                        </View>
                    )}
                </View>

                {/* Main Info */}
                <View style={styles.content}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.name}>{academy.name}</Text>
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={14} color="#fff" />
                            <Text style={styles.ratingText}>4.9</Text>
                        </View>
                    </View>

                    <Text style={styles.address}>
                        <Ionicons name="location-outline" size={14} color="#6b7280" /> {academy.address}
                    </Text>

                    {/* Tabs / Sections */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sobre</Text>
                        <Text style={styles.description}>
                            {academy.description || 'Uma excelente opção para seus treinos. Equipamentos modernos e ambiente climatizado.'}
                        </Text>
                    </View>

                    {/* Amenities */}
                    {academy.amenities && academy.amenities.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Comodidades</Text>
                            <View style={styles.amenitiesGrid}>
                                {academy.amenities.map((item: string, index: number) => (
                                    <View key={index} style={styles.amenityItem}>
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#2563eb" />
                                        <Text style={styles.amenityText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Rules / Important Info */}
                    {academy.rules && academy.rules.length > 0 && (
                        <View style={styles.infoBox}>
                            <View style={styles.infoBoxHeader}>
                                <Ionicons name="information-circle" size={20} color="#4b5563" />
                                <Text style={styles.infoBoxTitle}>Informações Importantes</Text>
                            </View>
                            {academy.rules.map((rule: string, index: number) => (
                                <Text key={index} style={styles.ruleText}>• {rule}</Text>
                            ))}
                        </View>
                    )}

                    {/* Schedule */}
                    {academy.opening_hours && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Horário de Funcionamento</Text>
                            <View style={styles.scheduleContainer}>
                                {Object.entries(academy.opening_hours).map(([day, hours]: [string, any]) => (
                                    <View key={day} style={styles.scheduleRow}>
                                        <Text style={styles.dayText}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                                        <Text style={styles.hoursText}>
                                            {typeof hours === 'object' && hours !== null
                                                ? `${hours.open} - ${hours.close}`
                                                : String(hours)
                                            }
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Contacts */}
                    {academy.contacts && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contato</Text>
                            <View style={styles.contactsRow}>
                                {academy.contacts.instagram && (
                                    <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(`https://instagram.com/${academy.contacts.instagram.replace('@', '')}`)}>
                                        <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                                        <Text style={styles.contactText}>Instagram</Text>
                                    </TouchableOpacity>
                                )}
                                {academy.contacts.phone && (
                                    <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL(`tel:${academy.contacts.phone}`)}>
                                        <Ionicons name="call" size={20} color="#2563eb" />
                                        <Text style={styles.contactText}>Ligar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.bottomLabel}>Plano aceito</Text>
                    <Text style={styles.bottomValue}>
                        {academy.modality === 'gym_standard' ? 'Solo & Família' : 'Consulte'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.checkinButton} onPress={handleCheckIn}>
                    <Text style={styles.checkinButtonText}>Fazer Check-in</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        height: 250,
        width: '100%',
        position: 'relative',
    },
    image: {
        width: width,
        height: 250,
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 20,
    },
    content: {
        padding: 20,
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
        marginRight: 10,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    ratingText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    address: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 22,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },
    amenityText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    infoBox: {
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    infoBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    infoBoxTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    ruleText: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 6,
        lineHeight: 20,
    },
    scheduleContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
    },
    scheduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    hoursText: {
        fontSize: 14,
        color: '#6b7280',
    },
    contactsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    contactText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    bottomLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    bottomValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    checkinButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    checkinButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
