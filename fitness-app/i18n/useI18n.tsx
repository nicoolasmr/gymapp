import { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Locale, defaultLocale } from './config';
import ptTranslations from './locales/pt.json';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

const translations = {
    'pt-BR': ptTranslations,
    'en-US': enTranslations,
    'es-MX': esTranslations,
};

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => Promise<void>;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(defaultLocale);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        loadLocale();
    }, []);

    const loadLocale = async () => {
        try {
            const savedLocale = await AsyncStorage.getItem('locale') as Locale;
            if (savedLocale && translations[savedLocale]) {
                setLocaleState(savedLocale);
            }
        } catch (error) {
            console.error('Error loading locale:', error);
        } finally {
            setIsReady(true);
        }
    };

    const setLocale = async (newLocale: Locale) => {
        try {
            setLocaleState(newLocale);
            await AsyncStorage.setItem('locale', newLocale);
        } catch (error) {
            console.error('Error saving locale:', error);
        }
    };

    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[locale];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        return typeof value === 'string' ? value : key;
    };

    if (!isReady) {
        return null; // or a loading component
    }

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within I18nProvider');
    }
    return context;
}
