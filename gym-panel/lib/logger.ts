import { createClient } from '@supabase/supabase-js';

// Simple types for structured logging
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
    message: string;
    level: LogLevel;
    context?: Record<string, any>;
    userId?: string;
    requestId?: string;
    timestamp: string;
}

const isDev = process.env.NODE_ENV === 'development';

class Logger {
    private static instance: Logger;

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private log(level: LogLevel, message: string, context: Record<string, any> = {}) {
        // In a real scenario, requestId would come from AsyncLocalStorage (Next.js headers)
        const payload: LogPayload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };

        if (isDev) {
            // Pretty print for DX
            const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[32m';
            console.log(`${color}[${level.toUpperCase()}] \x1b[0m ${message}`, context);
        } else {
            // JSON Lines for Datadog/CloudWatch/Sentry
            console.log(JSON.stringify(payload));
        }

        // Futuro: Sentry toggle
        // if (level === 'error') Sentry.captureException(new Error(message), { extra: context });
    }

    public info(message: string, context?: Record<string, any>) {
        this.log('info', message, context);
    }

    public warn(message: string, context?: Record<string, any>) {
        this.log('warn', message, context);
    }

    public error(message: string, error?: any, context?: Record<string, any>) {
        this.log('error', message, { ...context, error: error?.message || error });
    }
}

export const logger = Logger.getInstance();
