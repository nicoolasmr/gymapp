import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reviewService } from '../../../services/reviewService';
import { useAuthStore } from '../../../hooks/useAuthStore';

const TAGS_OPTIONS = ['Limpeza Impecável', 'Equipamentos Novos', 'Bom Atendimento', 'Ar Condicionado', 'Lotada', 'Preço Justo'];

export default function ReviewScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();


    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Avaliação necessária', 'Por favor, selecione uma nota de 1 a 5 estrelas.');
            return;
        }

        if (!user) return;

        try {
            setLoading(true);
            await reviewService.submitReview(id as string, user.id, rating, comment, selectedTags);
            Alert.alert('Sucesso', 'Sua avaliação foi enviada!', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível enviar a avaliação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Avaliar Academia</Text>
            <Text style={styles.subtitle}>Como foi sua experiência?</Text>

            {/* Star Rating */}
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons
                            name={star <= rating ? "star" : "star-outline"}
                            size={40}
                            color={star <= rating ? "#FFD700" : "#E5E5E5"}
                        />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tags */}
            <Text style={styles.label}>Pontos Fortes/Fracos</Text>
            <View style={styles.tagsContainer}>
                {TAGS_OPTIONS.map(tag => (
                    <TouchableOpacity
                        key={tag}
                        style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                        onPress={() => toggleTag(tag)}
                    >
                        <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>{tag}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Comment */}
            <Text style={styles.label}>Comentário (Opcional)</Text>
            <TextInput
                style={styles.input}
                placeholder="Conte mais detalhes..."
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
            />

            <TouchableOpacity
                style={[styles.submitButton, (loading || rating === 0) && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={loading || rating === 0}
            >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Enviar Avaliação</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#1F2937' },
    subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
    starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 32 },
    label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    tag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    tagSelected: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
    tagText: { color: '#6B7280', fontSize: 14 },
    tagTextSelected: { color: '#6366F1', fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, height: 120, textAlignVertical: 'top', marginBottom: 32, fontSize: 16 },
    submitButton: { backgroundColor: '#6366F1', padding: 16, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#9CA3AF' },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
