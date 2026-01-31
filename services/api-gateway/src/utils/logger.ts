/**
 * Structured Logger using Pino
 * Production-ready logging with request correlation
 */

import pino from 'pino';
import { env, isDev } from './env.js';

// Create logger with environment-aware configuration
export const logger = pino({
    name: 'api-gateway',
    level: env.LOG_LEVEL,
    transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// Create child logger with component context
export const createLogger = (component: string) =>
    logger.child({ component });

// Request-scoped logger
export interface RequestLog {
    requestId: string;
    method: string;
    path: string;
    userId?: string;
}

export const createRequestLogger = (context: RequestLog) =>
    logger.child(context);

export default logger;
