/**
 * MongoDB Connection Service
 * Handles database connection lifecycle
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { env } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';
import type { User, RefreshToken, ExchangeApiKey, Strategy } from '../types/index.js';

const log = createLogger('MongoDB');

let client: MongoClient | null = null;
let db: Db | null = null;

// Collection interfaces for type safety
interface Collections {
    users: Collection<User>;
    refreshTokens: Collection<RefreshToken>;
    apiKeys: Collection<ExchangeApiKey>;
    strategies: Collection<Strategy>;
}

let collections: Collections | null = null;

/**
 * Connect to MongoDB
 */
export async function connectMongo(): Promise<void> {
    if (client) {
        log.warn('MongoDB already connected');
        return;
    }

    try {
        log.info('Connecting to MongoDB...');

        client = new MongoClient(env.MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        db = client.db();

        // Initialize collections
        collections = {
            users: db.collection<User>('users'),
            refreshTokens: db.collection<RefreshToken>('refreshTokens'),
            apiKeys: db.collection<ExchangeApiKey>('apiKeys'),
            strategies: db.collection<Strategy>('strategies'),
        };

        // Create indexes
        await createIndexes();

        log.info({ database: db.databaseName }, 'MongoDB connected successfully');
    } catch (error) {
        log.error({ error }, 'Failed to connect to MongoDB');
        throw error;
    }
}

/**
 * Create database indexes for performance
 */
async function createIndexes(): Promise<void> {
    if (!collections) return;

    log.info('Creating MongoDB indexes...');

    // Users collection indexes
    await collections.users.createIndex({ email: 1 }, { unique: true });
    await collections.users.createIndex({ createdAt: 1 });

    // Refresh tokens indexes
    await collections.refreshTokens.createIndex({ userId: 1 });
    await collections.refreshTokens.createIndex({ token: 1 }, { unique: true });
    await collections.refreshTokens.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 } // TTL index
    );

    // API Keys indexes
    await collections.apiKeys.createIndex({ userId: 1 });
    await collections.apiKeys.createIndex({ userId: 1, exchange: 1 });

    // Strategies indexes
    await collections.strategies.createIndex({ userId: 1 });
    await collections.strategies.createIndex({ userId: 1, status: 1 });
    await collections.strategies.createIndex({ createdAt: -1 });

    log.info('MongoDB indexes created');
}

/**
 * Get database instance
 */
export function getDb(): Db {
    if (!db) {
        throw new Error('MongoDB not connected. Call connectMongo() first.');
    }
    return db;
}

/**
 * Get typed collections
 */
export function getCollections(): Collections {
    if (!collections) {
        throw new Error('MongoDB not connected. Call connectMongo() first.');
    }
    return collections;
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectMongo(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        collections = null;
        log.info('MongoDB disconnected');
    }
}

/**
 * Health check
 */
export async function mongoHealthCheck(): Promise<boolean> {
    try {
        if (!client || !db) return false;
        await db.command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
}
