/**
 * Structured Logger Configuration
 * Uses Pino for high-performance JSON logging
 */

import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            }
        }
        : undefined,
    base: {
        service: 'ingestion',
        version: '0.1.0',
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
});

export type Logger = typeof logger;
