import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async () => {
        if (!email || !password || !fullName || !cpf) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        setLoading(true);

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            Alert.alert('Erro no cadastro', authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            // 2. Create Profile in 'users' table
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: email,
                    full_name: fullName,
                    cpf: cpf,
                    role: 'user'
                });

            if (profileError) {
                Alert.alert('Erro ao salvar perfil', profileError.message);
            } else {
                Alert.alert('Sucesso', 'Conta criada! Faça login.');
                router.replace('/(auth)/login');
            }
        }

        setLoading(false);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Crie sua conta</Text>
                <Text style={styles.subtitle}>Comece a treinar hoje mesmo</Text>

                <Input
                    label="Nome Completo"
                    placeholder="João Silva"
                    value={fullName}
                    onChangeText={setFullName}
                />

                <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    keyboardType="numeric"
                    value={cpf}
                    onChangeText={setCpf}
                />

                <Input
                    label="Email"
                    placeholder="seu@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />

                <Input
                    label="Senha"
                    placeholder="********"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <Button title="Cadastrar" onPress={handleSignup} loading={loading} style={{ marginTop: 8 }} />

                <Link href="/(auth)/login" asChild>
                    <Button title="Voltar para Login" variant="outline" style={{ marginTop: 12 }} />
                </Link>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 32,
    },
});
