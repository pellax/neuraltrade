/**
 * Environment Configuration
 * Loads and validates environment variables with Zod
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file
config();

const envSchema = z.object({
    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

    // Server
    PORT: z.coerce.number().default(3000),

    // MongoDB
    MONGODB_URI: z.string().url().default('mongodb://localhost:27017/neuraltrade'),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // RabbitMQ
    RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
    RABBITMQ_EXCHANGE: z.string().default('neuraltrade.events'),

    // JWT
    JWT_SECRET: z.string().min(32).default('your-super-secret-jwt-key-change-in-production'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // Encryption
    AES_ENCRYPTION_KEY: z.string().length(64).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

    // Internal Services
    INGESTION_URL: z.string().url().default('http://localhost:3001'),
    ML_ENGINE_URL: z.string().url().default('http://localhost:8000'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

// Parse and validate environment
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;

// Helper to check environment
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
