import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../hooks/useAuthStore';
import { supabase } from '../../lib/supabase';

// Helper component for section headers
const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
);

// Helper component for option item with selection check
const OptionItem = ({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) => (
    <TouchableOpacity style={styles.optionItem} onPress={onSelect}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
        {selected && <Ionicons name="checkmark-circle" size={20} color="#2563eb" />}
    </TouchableOpacity>
);

export default function PrivacySettingsScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Privacy States
    const [profileVisibility, setProfileVisibility] = useState('public');
    const [allowPvp, setAllowPvp] = useState('everyone');
    const [showStats, setShowStats] = useState('everyone');

    useEffect(() => {
        if (!user) return;
        fetchSettings();
    }, [user]);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_user_privacy_settings', { p_user_id: user?.id });

            if (data) {
                setProfileVisibility(data.profile_visibility || 'public');
                setAllowPvp(data.allow_pvp_challenges || 'everyone');
                setShowStats(data.show_stats_details || 'everyone');
            }
        } catch (error) {
            console.log('Error fetching privacy settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSetting = async (key: string, value: string) => {
        // Optimistic update
        if (key === 'profile_visibility') setProfileVisibility(value);
        if (key === 'allow_pvp') setAllowPvp(value);
        if (key === 'show_stats') setShowStats(value);

        setSaving(true);
        try {
            // Map keys to API params
            const params: any = { p_user_id: user?.id };
            if (key === 'profile_visibility') params.p_profile_visibility = value;
            if (key === 'allow_pvp') params.p_allow_pvp = value;
            if (key === 'show_stats') params.p_show_stats = value;

            const { error } = await supabase.rpc('update_privacy_settings', params);
            if (error) throw error;

        } catch (error) {
            console.log('Error saving setting:', error);
            Alert.alert('Erro', 'Não foi possível salvar a alteração.');
            // Revert would be nice here in full implementation
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacidade</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.description}>
                    Controle quem pode ver suas informações e interagir com você.
                </Text>

                {/* Profile Visibility */}
                <SectionHeader title="Quem pode ver meu perfil?" />
                <View style={styles.card}>
                    <OptionItem
                        label="Público (Todos)"
                        selected={profileVisibility === 'public'}
                        onSelect={() => saveSetting('profile_visibility', 'public')}
                    />
                    <View style={styles.separator} />
                    <OptionItem
                        label="Apenas Amigos/Seguidores"
                        selected={profileVisibility === 'friends_only'}
                        onSelect={() => saveSetting('profile_visibility', 'friends_only')}
                    />
                    <View style={styles.separator} />
                    <OptionItem
                        label="Privado (Apenas Eu)"
                        selected={profileVisibility === 'private'}
                        onSelect={() => saveSetting('profile_visibility', 'private')}
                    />
                </View>

                {/* PVP Challenges */}
                <SectionHeader title="Quem pode me enviar desafios PVP?" />
                <View style={styles.card}>
                    <OptionItem
                        label="Todos"
                        selected={allowPvp === 'everyone'}
                        onSelect={() => saveSetting('allow_pvp', 'everyone')}
                    />
                    <View style={styles.separator} />
                    <OptionItem
                        label="Apenas Amigos/Seguidores"
                        selected={allowPvp === 'followers_only'}
                        onSelect={() => saveSetting('allow_pvp', 'followers_only')}
                    />
                    <View style={styles.separator} />
                    <OptionItem
                        label="Ninguém"
                        selected={allowPvp === 'no_one'}
                        onSelect={() => saveSetting('allow_pvp', 'no_one')}
                    />
                </View>

                {/* Stats Details */}
                <SectionHeader title="Quem pode ver meus gráficos e stats?" />
                <View style={styles.card}>
                    <OptionItem
                        label="Todos"
                        selected={showStats === 'everyone'}
                        onSelect={() => saveSetting('show_stats', 'everyone')}
                    />
                    <View style={styles.separator} />
                    <OptionItem
                        label="Apenas Amigos/Seguidores"
                        selected={showStats === 'followers_only'}
                        onSelect={() => saveSetting('show_stats', 'followers_only')}
                    />
                    <View style={styles.separator} />
                    <OptionItem
                        label="Apenas Eu"
                        selected={showStats === 'only_me'}
                        onSelect={() => saveSetting('show_stats', 'only_me')}
                    />
                </View>

                {/* Blocked Users Link */}
                <TouchableOpacity style={styles.blockedLink}>
                    <Text style={styles.blockedLinkText}>Gerenciar usuários bloqueados</Text>
                    <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </TouchableOpacity>

            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingTop: 60,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
        lineHeight: 20,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 4, // reduced padding as items have padding
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    optionLabel: {
        fontSize: 16,
        color: '#374151',
    },
    optionLabelSelected: {
        color: '#2563eb',
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginLeft: 16,
    },
    blockedLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginTop: 8,
    },
    blockedLinkText: {
        fontSize: 16,
        color: '#ef4444',
        fontWeight: '500',
    },
});
