/**
 * Environment Configuration
 * Validated with Zod for type safety
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try loading from service directory first, then from monorepo root
dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Service
    INGESTION_PORT: z.string().transform(Number).default('3001'),

    // RabbitMQ
    RABBITMQ_URL: z.string().url(),
    RABBITMQ_EXCHANGE: z.string().default('neuraltrade.events'),
    RABBITMQ_QUEUE_PRICES: z.string().default('prices.ingest'),

    // InfluxDB
    INFLUXDB_URL: z.string().url(),
    INFLUXDB_TOKEN: z.string(),
    INFLUXDB_ORG: z.string(),
    INFLUXDB_BUCKET: z.string(),

    // Logging
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
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
