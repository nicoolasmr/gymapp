import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { AcademyCard } from '../../components/AcademyCard';
import { Ionicons } from '@expo/vector-icons';

export default function ExploreScreen() {
    const [academies, setAcademies] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAcademies = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('academies')
                .select('*')
                .eq('active', true);

            if (data) setAcademies(data);
            setLoading(false);
        };

        fetchAcademies();
    }, []);

    const filteredAcademies = academies.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.address.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Explorar</Text>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar academia ou bairro..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <FlatList
                data={filteredAcademies}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <AcademyCard
                        id={item.id}
                        name={item.name}
                        address={item.address}
                        category={item.category}
                        logoUrl={item.logo_url}
                    />
                )}
                ListEmptyComponent={
                    !loading ? (
                        <Text style={styles.emptyText}>Nenhuma academia encontrada.</Text>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        padding: 24,
        paddingTop: 60,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#111827',
    },
    list: {
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 32,
    },
});
