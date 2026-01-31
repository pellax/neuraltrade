/**
 * Redis Connection Service
 * Handles caching, rate limiting, and session management
 */

import Redis from 'ioredis';
import { env } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Redis');

let redis: Redis | null = null;

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<Redis> {
    if (redis) {
        log.warn('Redis already connected');
        return redis;
    }

    try {
        log.info('Connecting to Redis...');

        redis = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            enableReadyCheck: true,
            retryStrategy: (times) => {
                if (times > 5) {
                    log.error('Redis connection failed after 5 retries');
                    return null;
                }
                return Math.min(times * 100, 3000);
            },
        });

        redis.on('connect', () => {
            log.info('Redis connected');
        });

        redis.on('ready', () => {
            log.info('Redis ready');
        });

        redis.on('error', (err) => {
            log.error({ err }, 'Redis error');
        });

        redis.on('close', () => {
            log.warn('Redis connection closed');
        });

        await redis.connect();

        return redis;
    } catch (error) {
        log.error({ error }, 'Failed to connect to Redis');
        throw error;
    }
}

/**
 * Get Redis instance
 */
export function getRedis(): Redis {
    if (!redis) {
        throw new Error('Redis not connected. Call connectRedis() first.');
    }
    return redis;
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
        log.info('Redis disconnected');
    }
}

/**
 * Health check
 */
export async function redisHealthCheck(): Promise<boolean> {
    try {
        if (!redis) return false;
        const pong = await redis.ping();
        return pong === 'PONG';
    } catch {
        return false;
    }
}

// ============================================
// CACHE HELPERS
// ============================================

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Set a cached value
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    const r = getRedis();
    await r.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
}

/**
 * Get a cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
    const r = getRedis();
    const value = await r.get(`cache:${key}`);
    if (!value) return null;
    return JSON.parse(value) as T;
}

/**
 * Delete a cached value
 */
export async function deleteCache(key: string): Promise<void> {
    const r = getRedis();
    await r.del(`cache:${key}`);
}

/**
 * Clear cache by pattern
 */
export async function clearCachePattern(pattern: string): Promise<void> {
    const r = getRedis();
    const keys = await r.keys(`cache:${pattern}`);
    if (keys.length > 0) {
        await r.del(...keys);
    }
}

// ============================================
// RATE LIMITING HELPERS
// ============================================

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Check and update rate limit using sliding window
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): Promise<RateLimitResult> {
    const r = getRedis();
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    // Remove old entries
    await r.zremrangebyscore(redisKey, 0, windowStart);

    // Count current entries
    const count = await r.zcard(redisKey);

    if (count >= limit) {
        // Get oldest entry to calculate reset time
        const oldest = await r.zrange(redisKey, 0, 0, 'WITHSCORES');
        const resetAt = oldest.length > 1
            ? parseInt(oldest[1]) + windowMs
            : now + windowMs;

        return {
            allowed: false,
            remaining: 0,
            resetAt,
        };
    }

    // Add current request
    await r.zadd(redisKey, now, `${now}-${Math.random()}`);
    await r.pexpire(redisKey, windowMs);

    return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: now + windowMs,
    };
}

// ============================================
// SESSION/TOKEN BLACKLIST
// ============================================

/**
 * Add a token to the blacklist (for logout)
 */
export async function blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    const r = getRedis();
    await r.setex(`blacklist:${token}`, expiresInSeconds, '1');
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
    const r = getRedis();
    const result = await r.get(`blacklist:${token}`);
    return result === '1';
}
