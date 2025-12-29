// i18n Configuration for Mobile App
export const defaultLocale = 'pt-BR';

export const locales = {
    'pt-BR': 'Português',
    'en-US': 'English',
    'es-MX': 'Español',
} as const;

export type Locale = keyof typeof locales;

export const currencies = {
    'pt-BR': { code: 'BRL', symbol: 'R$' },
    'en-US': { code: 'USD', symbol: '$' },
    'es-MX': { code: 'MXN', symbol: '$' },
} as const;

export function formatCurrency(amount: number, locale: Locale): string {
    const currency = currencies[locale];
    return `${currency.symbol} ${(amount / 100).toFixed(2)}`;
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
