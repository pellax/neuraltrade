/**
 * Logger Utility
 * Structured logging with Pino
 */

import pino from 'pino';
import { env, isDev } from './env.js';

export const logger = pino({
    name: env.SERVICE_NAME,
    level: env.LOG_LEVEL,
    transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});

export function createLogger(context: string) {
    return logger.child({ context });
}
