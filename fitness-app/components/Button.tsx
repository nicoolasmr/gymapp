import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps, TextStyle, StyleProp } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
    textStyle?: StyleProp<TextStyle>;
}

export function Button({ title, loading, variant = 'primary', style, textStyle, ...props }: ButtonProps) {
    const getBackgroundColor = () => {
        if (variant === 'primary') return '#2563eb'; // Blue-600
        if (variant === 'secondary') return '#4b5563'; // Gray-600
        return 'transparent';
    };

    const getTextColor = () => {
        if (variant === 'outline') return '#2563eb';
        return '#ffffff';
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor(), borderColor: variant === 'outline' ? '#2563eb' : 'transparent', borderWidth: variant === 'outline' ? 1 : 0 },
                style,
                props.disabled && styles.disabled
            ]}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.6,
    },
});
