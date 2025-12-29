import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

interface AcademyCardProps {
    id: string;
    name: string;
    address: string;
    category?: string;
    distance?: string;
    logoUrl?: string | null;
}

export function AcademyCard({ id, name, address, category, distance, logoUrl }: AcademyCardProps) {
    return (
        <Link href={`/academy/${id}`} asChild>
            <TouchableOpacity style={styles.card}>
                <View style={styles.imagePlaceholder}>
                    {logoUrl ? (
                        <Image
                            source={{ uri: logoUrl }}
                            style={{ width: '100%', height: '100%', borderRadius: 8 }}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons name="fitness" size={40} color="#9ca3af" />
                    )}
                </View>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{name}</Text>
                        {distance && <Text style={styles.distance}>{distance}</Text>}
                    </View>
                    <Text style={styles.address} numberOfLines={1}>{address}</Text>
                    {category && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{category}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Link>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
            web: {
                // @ts-ignore
                boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
            },
        }),
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    distance: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 8,
    },
    address: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    badge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '500',
    },
});
