/**
 * Environment Configuration
 * Validated configuration for Trading Service
 */

import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Service
    SERVICE_NAME: z.string().default('trading-service'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // MongoDB
    MONGODB_URI: z.string().url().default('mongodb://localhost:27017/neuraltrade'),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // RabbitMQ
    RABBITMQ_URL: z.string().default('amqp://localhost:5672'),

    // Queues
    SIGNALS_QUEUE: z.string().default('trading.signals'),
    ORDERS_QUEUE: z.string().default('trading.orders'),
    POSITIONS_EXCHANGE: z.string().default('trading.positions'),

    // Trading Config
    ORDER_RETRY_ATTEMPTS: z.coerce.number().default(3),
    ORDER_RETRY_DELAY_MS: z.coerce.number().default(1000),
    PRICE_SLIPPAGE_TOLERANCE: z.coerce.number().default(0.5),
    MIN_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.7),
    ENABLE_DRY_RUN_FALLBACK: z.coerce.boolean().default(true),

    // Risk Limits (defaults)
    MAX_POSITION_SIZE_PERCENT: z.coerce.number().default(10),
    MAX_POSITION_SIZE_USD: z.coerce.number().default(10000),
    MAX_DAILY_LOSS_PERCENT: z.coerce.number().default(5),
    MAX_OPEN_POSITIONS: z.coerce.number().default(10),
    MAX_LEVERAGE: z.coerce.number().default(3),
    REQUIRE_STOP_LOSS: z.coerce.boolean().default(true),

    // Encryption (for API keys decryption)
    ENCRYPTION_KEY: z.string().min(32),
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
