/**
 * Environment Configuration
 * Validated configuration for Notification Service
 */

import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Service
    SERVICE_NAME: z.string().default('notification-service'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // MongoDB
    MONGODB_URI: z.string().url().default('mongodb://localhost:27017/neuraltrade'),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // RabbitMQ
    RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
    NOTIFICATIONS_QUEUE: z.string().default('notifications'),

    // Email (SMTP)
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('NeuralTrade <noreply@neuraltrade.io>'),

    // Telegram
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_API_URL: z.string().default('https://api.telegram.org'),

    // Discord
    DISCORD_WEBHOOK_URL: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string().optional(),

    // Rate Limiting
    MAX_NOTIFICATIONS_PER_MINUTE: z.coerce.number().default(30),
    MAX_NOTIFICATIONS_PER_HOUR: z.coerce.number().default(100),

    // Retry Config
    MAX_RETRY_ATTEMPTS: z.coerce.number().default(3),
    RETRY_DELAY_MS: z.coerce.number().default(5000),

    // Frontend URL for verification links
    FRONTEND_URL: z.string().url().default('http://localhost:3100'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
}

export const env = validateEnv();

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
