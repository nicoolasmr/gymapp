// i18n Configuration
export const defaultLocale = 'pt-BR';

export const locales = {
    'pt-BR': 'Português (Brasil)',
    'en-US': 'English (US)',
    'es-MX': 'Español (México)',
    'pt-PT': 'Português (Portugal)',
    'es-ES': 'Español (España)',
} as const;

export type Locale = keyof typeof locales;

export const currencies = {
    'pt-BR': { code: 'BRL', symbol: 'R$' },
    'en-US': { code: 'USD', symbol: '$' },
    'es-MX': { code: 'MXN', symbol: '$' },
    'pt-PT': { code: 'EUR', symbol: '€' },
    'es-ES': { code: 'EUR', symbol: '€' },
} as const;

export const timezones = {
    'pt-BR': 'America/Sao_Paulo',
    'en-US': 'America/New_York',
    'es-MX': 'America/Mexico_City',
    'pt-PT': 'Europe/Lisbon',
    'es-ES': 'Europe/Madrid',
} as const;

export function formatCurrency(amount: number, locale: Locale): string {
    const currency = currencies[locale];
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.code,
    }).format(amount / 100);
}

export function formatDate(date: Date, locale: Locale): string {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}

export function formatTime(date: Date, locale: Locale): string {
    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
