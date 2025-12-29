import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Academy {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    modality: string;
    distance?: number;
}

const MODALITIES = ['Todas', 'Cross', 'Funcional', 'Yoga', 'Muay Thai', 'Pilates', 'Musculação'];

export default function MapScreen() {
    const [academies, setAcademies] = useState<Academy[]>([]);
    const [selectedModality, setSelectedModality] = useState('Todas');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchAcademies();
    }, [selectedModality]);

    const fetchAcademies = async () => {
        try {
            let query = supabase
                .from('academies')
                .select('*')
                .eq('status', 'active');

            if (selectedModality !== 'Todas') {
                query = query.eq('modality', selectedModality);
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;
            setAcademies(data || []);
        } catch (error) {
            console.error('Error fetching academies:', error);
        } finally {
            setLoading(false);
        }
    };

    const getModalityIcon = (modality: string) => {
        const icons: { [key: string]: string } = {
            'Cross': '🏋️',
            'Funcional': '💪',
            'Yoga': '🧘',
            'Muay Thai': '🥊',
            'Pilates': '🤸',
            'Musculação': '💪',
            'Bike Indoor': '🚴',
        };
        return icons[modality] || '🏃';
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🗺️ Mapa de Academias</Text>
                <Text style={styles.headerSubtitle}>{academies.length} academias encontradas</Text>
            </View>

            {/* Filters */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
                contentContainerStyle={styles.filtersContent}
            >
                {MODALITIES.map((modality) => (
                    <TouchableOpacity
                        key={modality}
                        style={[
                            styles.filterChip,
                            selectedModality === modality && styles.filterChipActive
                        ]}
                        onPress={() => setSelectedModality(modality)}
                    >
                        <Text style={[
                            styles.filterText,
                            selectedModality === modality && styles.filterTextActive
                        ]}>
                            {modality}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Map Placeholder */}
            <View style={styles.mapPlaceholder}>
                <Ionicons name="map" size={64} color="#9CA3AF" />
                <Text style={styles.mapPlaceholderText}>
                    Mapa interativo será implementado com react-native-maps
                </Text>
                <Text style={styles.mapPlaceholderSubtext}>
                    Por enquanto, veja a lista de academias abaixo
                </Text>
            </View>

            {/* Academies List */}
            <ScrollView style={styles.academiesList} contentContainerStyle={styles.academiesContent}>
                {academies.map((academy) => (
                    <TouchableOpacity
                        key={academy.id}
                        style={styles.academyCard}
                        onPress={() => router.push(`/academy/${academy.id}`)}
                    >
                        <View style={styles.academyIcon}>
                            <Text style={styles.academyIconText}>
                                {getModalityIcon(academy.modality)}
                            </Text>
                        </View>
                        <View style={styles.academyInfo}>
                            <Text style={styles.academyName}>{academy.name}</Text>
                            <Text style={styles.academyAddress}>{academy.address}</Text>
                            <View style={styles.academyMeta}>
                                <Text style={styles.academyModality}>{academy.modality}</Text>
                                {academy.distance && (
                                    <Text style={styles.academyDistance}>
                                        📍 {academy.distance.toFixed(1)} km
                                    </Text>
                                )}
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
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
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    filtersContainer: {
        maxHeight: 60,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filtersContent: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    filterChipActive: {
        backgroundColor: '#3B82F6',
    },
    filterText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    mapPlaceholder: {
        height: 200,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mapPlaceholderText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
    },
    mapPlaceholderSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 4,
    },
    academiesList: {
        flex: 1,
    },
    academiesContent: {
        padding: 16,
    },
    academyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    academyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    academyIconText: {
        fontSize: 24,
    },
    academyInfo: {
        flex: 1,
    },
    academyName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    academyAddress: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 6,
    },
    academyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    academyModality: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '500',
    },
    academyDistance: {
        fontSize: 12,
        color: '#9CA3AF',
    },
});
