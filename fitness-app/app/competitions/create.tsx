import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { competitionService } from '../../services/competitionService';

export default function CreateCompetitionScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [modality, setModality] = useState('all');
    const [scoringRule, setScoringRule] = useState('total_checkins');
    const [isPublic, setIsPublic] = useState(false);

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 dias

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'O nome da competição é obrigatório.');
            return;
        }

        if (endDate <= startDate) {
            Alert.alert('Erro', 'A data de término deve ser após a data de início.');
            return;
        }

        setLoading(true);
        try {
            await competitionService.createCompetition({
                name,
                description,
                modality_filter: modality,
                scoring_rule: scoringRule,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                is_public: isPublic,
                max_participants: 50 // Default limit
            });

            Alert.alert('Sucesso', 'Competição criada com sucesso!', [
                {
                    text: 'OK',
                    onPress: () => router.canGoBack() ? router.back() : router.replace('/competitions')
                }
            ]);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível criar a competição.');
        } finally {
            setLoading(false);
        }
    };

    const onStartDateChange = (event: any, selectedDate?: Date) => {
        setShowStartPicker(Platform.OS === 'ios');
        if (selectedDate) setStartDate(selectedDate);
    };

    const onEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndPicker(Platform.OS === 'ios');
        if (selectedDate) setEndDate(selectedDate);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/competitions')}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.title}>Criar Competição</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Basic Info */}
                <View style={styles.section}>
                    <Text style={styles.label}>Nome da Competição</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Desafio de Verão"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Descrição (Opcional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Regras, prêmios, etc..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Dates */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Período</Text>

                    <View style={styles.dateRow}>
                        <View style={styles.dateContainer}>
                            <Text style={styles.label}>Início</Text>
                            <View style={styles.dateButtonContainer}>
                                {Platform.OS === 'web' ? (
                                    <View style={styles.dateButton}>
                                        {React.createElement('input', {
                                            type: 'date',
                                            value: startDate.toISOString().split('T')[0],
                                            onChange: (e: any) => {
                                                if (e.target.value) {
                                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                                    onStartDateChange(null, new Date(y, m - 1, d, 12));
                                                }
                                            },
                                            style: {
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                width: '100%',
                                                height: '100%',
                                                fontSize: 16,
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                color: '#111827'
                                            }
                                        })}
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowStartPicker(true)}
                                    >
                                        <Text>{startDate.toLocaleDateString()}</Text>
                                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={styles.dateContainer}>
                            <Text style={styles.label}>Fim</Text>
                            <View style={styles.dateButtonContainer}>
                                {Platform.OS === 'web' ? (
                                    <View style={styles.dateButton}>
                                        {React.createElement('input', {
                                            type: 'date',
                                            value: endDate.toISOString().split('T')[0],
                                            min: startDate.toISOString().split('T')[0],
                                            onChange: (e: any) => {
                                                if (e.target.value) {
                                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                                    onEndDateChange(null, new Date(y, m - 1, d, 12));
                                                }
                                            },
                                            style: {
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                width: '100%',
                                                height: '100%',
                                                fontSize: 16,
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                color: '#111827'
                                            }
                                        })}
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setShowEndPicker(true)}
                                    >
                                        <Text>{endDate.toLocaleDateString()}</Text>
                                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {Platform.OS !== 'web' && showStartPicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={onStartDateChange}
                        />
                    )}

                    {Platform.OS !== 'web' && showEndPicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={onEndDateChange}
                            minimumDate={startDate}
                        />
                    )}
                </View>

                {/* Rules */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Regras</Text>

                    <Text style={styles.label}>Modalidade Válida</Text>
                    <View style={styles.optionsContainer}>
                        {[
                            { id: 'all', label: 'Todas' },
                            { id: 'gym_standard', label: 'Academia' },
                            { id: 'crossfit_box', label: 'CrossFit' },
                            { id: 'studio', label: 'Studio' }
                        ].map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.optionButton, modality === opt.id && styles.optionSelected]}
                                onPress={() => setModality(opt.id)}
                            >
                                <Text style={[styles.optionText, modality === opt.id && styles.optionTextSelected]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Critério de Pontuação</Text>
                    <View style={styles.optionsContainer}>
                        {[
                            { id: 'total_checkins', label: 'Total Check-ins' },
                            { id: 'streak_days', label: 'Sequência (Dias)' },
                            { id: 'unique_academies', label: 'Academias Únicas' }
                        ].map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.optionButton, scoringRule === opt.id && styles.optionSelected]}
                                onPress={() => setScoringRule(opt.id)}
                            >
                                <Text style={[styles.optionText, scoringRule === opt.id && styles.optionTextSelected]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.switchLabel}>Competição Pública</Text>
                            <Text style={styles.switchSubLabel}>Qualquer usuário pode ver e participar</Text>
                        </View>
                        <Switch
                            value={isPublic}
                            onValueChange={setIsPublic}
                            trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
                            thumbColor={isPublic ? '#2563eb' : '#f3f4f6'}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.createButton, loading && styles.buttonDisabled]}
                    onPress={handleCreate}
                    disabled={loading}
                >
                    <Text style={styles.createButtonText}>
                        {loading ? 'Criando...' : 'Criar Competição'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    content: {
        padding: 16,
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9fafb',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 16,
    },
    dateContainer: {
        flex: 1,
    },
    dateButtonContainer: {
        position: 'relative',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#f9fafb',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    optionSelected: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    optionText: {
        fontSize: 14,
        color: '#4b5563',
    },
    optionTextSelected: {
        color: '#2563eb',
        fontWeight: '600',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    switchSubLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    createButton: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
