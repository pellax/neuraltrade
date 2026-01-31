/**
 * Notification Dispatcher
 * Orchestrates multi-channel notification delivery
 */

import { MongoClient, Collection, ObjectId } from 'mongodb';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { sendEmail } from './email.js';
import { sendTelegram } from './telegram.js';
import { sendDiscord } from './discord.js';
import type {
    NotificationRequest,
    NotificationResult,
    NotificationLog,
    NotificationPreferences,
    NotificationChannel,
    QuietHours,
} from '../types/index.js';

const log = createLogger('Dispatcher');

let mongoClient: MongoClient | null = null;
let redis: Redis | null = null;
let logsCollection: Collection<NotificationLog> | null = null;
let preferencesCollection: Collection<NotificationPreferences> | null = null;

// ============================================
// INITIALIZATION
// ============================================

export async function initDispatcher(): Promise<void> {
    // MongoDB
    mongoClient = new MongoClient(env.MONGODB_URI);
    await mongoClient.connect();

    const db = mongoClient.db();
    logsCollection = db.collection<NotificationLog>('notification_logs');
    preferencesCollection = db.collection<NotificationPreferences>('notification_preferences');

    // Create indexes
    await logsCollection.createIndex({ userId: 1, createdAt: -1 });
    await logsCollection.createIndex({ notificationId: 1 }, { unique: true });
    await logsCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL
    await preferencesCollection.createIndex({ userId: 1 }, { unique: true });

    // Redis
    redis = new Redis(env.REDIS_URL);

    log.info('Dispatcher initialized');
}

export async function closeDispatcher(): Promise<void> {
    if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
    }
    if (redis) {
        redis.disconnect();
        redis = null;
    }
}

// ============================================
// MAIN DISPATCH
// ============================================

/**
 * Dispatch notification to all configured channels
 */
export async function dispatchNotification(
    request: NotificationRequest
): Promise<NotificationResult[]> {
    log.info({
        notificationId: request.id,
        userId: request.userId,
        type: request.type,
        channels: request.channels,
        priority: request.priority,
    }, 'Dispatching notification');

    // Check if already processed (deduplication)
    if (await isDuplicate(request.id)) {
        log.warn({ notificationId: request.id }, 'Duplicate notification, skipping');
        return [];
    }

    // Get user preferences
    const preferences = await getUserPreferences(request.userId);

    if (!preferences) {
        log.warn({ userId: request.userId }, 'No preferences found, using defaults');
    }

    const effectivePreferences = preferences ?? getDefaultPreferences(request.userId);

    // Check quiet hours
    if (shouldRespectQuietHours(effectivePreferences.quietHours, request.priority)) {
        log.info({ userId: request.userId }, 'Quiet hours active, skipping notification');
        return [{
            notificationId: request.id,
            channel: 'email',
            status: 'skipped',
            error: 'Quiet hours active',
        }];
    }

    // Check rate limiting
    if (await isRateLimited(request.userId)) {
        log.warn({ userId: request.userId }, 'Rate limit exceeded');
        return [{
            notificationId: request.id,
            channel: 'email',
            status: 'skipped',
            error: 'Rate limit exceeded',
        }];
    }

    // Dispatch to each channel
    const results: NotificationResult[] = [];

    for (const channel of request.channels) {
        const result = await dispatchToChannel(channel, request, effectivePreferences);
        results.push(result);
    }

    // Log results
    await logNotification(request, results);

    // Increment rate limit counter
    await incrementRateLimit(request.userId);

    return results;
}

/**
 * Dispatch to a specific channel
 */
async function dispatchToChannel(
    channel: NotificationChannel,
    request: NotificationRequest,
    preferences: NotificationPreferences
): Promise<NotificationResult> {
    try {
        switch (channel) {
            case 'email':
                return await sendEmail(request, preferences);
            case 'telegram':
                return await sendTelegram(request, preferences);
            case 'discord':
                return await sendDiscord(request, preferences);
            case 'push':
                // Push notifications not implemented yet
                return {
                    notificationId: request.id,
                    channel: 'push',
                    status: 'skipped',
                    error: 'Push notifications not implemented',
                };
            default:
                return {
                    notificationId: request.id,
                    channel,
                    status: 'failed',
                    error: `Unknown channel: ${channel}`,
                };
        }
    } catch (error) {
        log.error({ error, channel, notificationId: request.id }, 'Channel dispatch failed');
        return {
            notificationId: request.id,
            channel,
            status: 'failed',
            error: (error as Error).message,
        };
    }
}

// ============================================
// PREFERENCES
// ============================================

/**
 * Get user notification preferences
 */
export async function getUserPreferences(
    userId: string
): Promise<NotificationPreferences | null> {
    if (!preferencesCollection) return null;
    return preferencesCollection.findOne({ userId });
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences | null> {
    if (!preferencesCollection) return null;

    const result = await preferencesCollection.findOneAndUpdate(
        { userId },
        {
            $set: { ...updates, updatedAt: new Date() },
            $setOnInsert: { userId },
        },
        { upsert: true, returnDocument: 'after' }
    );

    return result;
}

/**
 * Get default preferences
 */
function getDefaultPreferences(userId: string): NotificationPreferences {
    return {
        userId,
        email: {
            enabled: false,
            verified: false,
            types: ['trade_executed', 'daily_summary', 'risk_alert'],
        },
        telegram: {
            enabled: false,
            verified: false,
            types: ['trade_executed', 'signal_generated', 'risk_alert'],
        },
        discord: {
            enabled: false,
            types: ['trade_executed', 'signal_generated'],
        },
        push: {
            enabled: false,
            tokens: [],
            types: ['trade_executed', 'risk_alert'],
        },
        updatedAt: new Date(),
    };
}

// ============================================
// QUIET HOURS
// ============================================

function shouldRespectQuietHours(
    quietHours: QuietHours | undefined,
    priority: string
): boolean {
    if (!quietHours?.enabled) return false;

    // Critical notifications bypass quiet hours if allowed
    if (priority === 'critical' && quietHours.allowCritical) return false;

    const now = new Date();
    const currentHour = now.getHours(); // Simplified - should use timezone

    const { startHour, endHour } = quietHours;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startHour > endHour) {
        return currentHour >= startHour || currentHour < endHour;
    }

    return currentHour >= startHour && currentHour < endHour;
}

// ============================================
// RATE LIMITING
// ============================================

async function isRateLimited(userId: string): Promise<boolean> {
    if (!redis) return false;

    const minuteKey = `notify:rate:${userId}:minute`;
    const hourKey = `notify:rate:${userId}:hour`;

    const [minuteCount, hourCount] = await Promise.all([
        redis.get(minuteKey),
        redis.get(hourKey),
    ]);

    const perMinute = parseInt(minuteCount ?? '0', 10);
    const perHour = parseInt(hourCount ?? '0', 10);

    return (
        perMinute >= env.MAX_NOTIFICATIONS_PER_MINUTE ||
        perHour >= env.MAX_NOTIFICATIONS_PER_HOUR
    );
}

async function incrementRateLimit(userId: string): Promise<void> {
    if (!redis) return;

    const minuteKey = `notify:rate:${userId}:minute`;
    const hourKey = `notify:rate:${userId}:hour`;

    await redis.multi()
        .incr(minuteKey)
        .expire(minuteKey, 60)
        .incr(hourKey)
        .expire(hourKey, 3600)
        .exec();
}

// ============================================
// DEDUPLICATION
// ============================================

async function isDuplicate(notificationId: string): Promise<boolean> {
    if (!redis) return false;

    const key = `notify:dedup:${notificationId}`;
    const exists = await redis.exists(key);

    if (exists) return true;

    // Set with 24h TTL
    await redis.setex(key, 86400, '1');
    return false;
}

// ============================================
// LOGGING
// ============================================

async function logNotification(
    request: NotificationRequest,
    results: NotificationResult[]
): Promise<void> {
    if (!logsCollection) return;

    const logEntry: NotificationLog = {
        notificationId: request.id,
        userId: request.userId,
        type: request.type,
        channels: request.channels,
        results,
        createdAt: new Date(),
        processedAt: new Date(),
    };

    try {
        await logsCollection.insertOne(logEntry);
    } catch (error) {
        log.error({ error, notificationId: request.id }, 'Failed to log notification');
    }
}

/**
 * Get notification history for user
 */
export async function getNotificationHistory(
    userId: string,
    limit: number = 50
): Promise<NotificationLog[]> {
    if (!logsCollection) return [];

    return logsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
}

// ============================================
// UTILITIES
// ============================================

/**
 * Create a notification request
 */
export function createNotificationRequest(
    params: Omit<NotificationRequest, 'id'>
): NotificationRequest {
    return {
        id: uuid(),
        ...params,
    };
}

/**
 * Send immediate notification (bypasses queue)
 */
export async function sendImmediate(
    request: NotificationRequest
): Promise<NotificationResult[]> {
    return dispatchNotification(request);
}
