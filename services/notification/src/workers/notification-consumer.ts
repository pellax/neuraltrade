/**
 * Notification Worker
 * Consumes notification requests from RabbitMQ
 */

import amqp from 'amqplib';
import type { Channel, ConsumeMessage } from 'amqplib';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { dispatchNotification } from '../services/dispatcher.js';
import type { NotificationMessage } from '../types/index.js';

const log = createLogger('NotificationWorker');

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Channel | null = null;

// ============================================
// CONNECTION
// ============================================

export async function startNotificationWorker(): Promise<void> {
    try {
        log.info('Starting notification worker...');

        // Connect to RabbitMQ
        connection = await amqp.connect(env.RABBITMQ_URL);
        channel = await connection.createChannel();

        // Setup dead letter exchange
        await channel.assertExchange('notifications.dlx', 'direct', { durable: true });
        await channel.assertQueue('notifications.dlq', {
            durable: true,
            arguments: { 'x-message-ttl': 86400000 }, // 24h retention
        });
        await channel.bindQueue('notifications.dlq', 'notifications.dlx', env.NOTIFICATIONS_QUEUE);

        // Setup main queue
        await channel.assertQueue(env.NOTIFICATIONS_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'notifications.dlx',
                'x-dead-letter-routing-key': env.NOTIFICATIONS_QUEUE,
            },
        });

        // Set prefetch
        await channel.prefetch(10);

        // Start consuming
        await channel.consume(env.NOTIFICATIONS_QUEUE, handleMessage, {
            noAck: false,
        });

        log.info({ queue: env.NOTIFICATIONS_QUEUE }, 'Notification worker started');

        // Handle connection events
        connection.on('error', handleConnectionError);
        connection.on('close', handleConnectionClose);

    } catch (error) {
        log.error({ error }, 'Failed to start notification worker');
        throw error;
    }
}

export async function stopNotificationWorker(): Promise<void> {
    log.info('Stopping notification worker...');

    if (channel) {
        await channel.close();
        channel = null;
    }

    if (connection) {
        await connection.close();
        connection = null;
    }

    log.info('Notification worker stopped');
}

// ============================================
// MESSAGE HANDLING
// ============================================

async function handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !channel) return;

    const startTime = Date.now();

    try {
        // Parse message
        const content = JSON.parse(msg.content.toString()) as NotificationMessage;

        if (content.type !== 'notification_request') {
            log.warn({ type: content.type }, 'Unknown message type');
            channel.ack(msg);
            return;
        }

        const request = content.payload;

        log.info({
            notificationId: request.id,
            type: request.type,
            channels: request.channels,
            priority: request.priority,
        }, 'Processing notification');

        // Check if scheduled for future
        if (request.scheduledAt && new Date(request.scheduledAt) > new Date()) {
            log.info({
                notificationId: request.id,
                scheduledAt: request.scheduledAt,
            }, 'Notification scheduled for future, requeuing');

            // Requeue with delay (simplified - would use delayed exchange in production)
            channel.nack(msg, false, true);
            return;
        }

        // Check expiration
        if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
            log.info({ notificationId: request.id }, 'Notification expired, discarding');
            channel.ack(msg);
            return;
        }

        // Dispatch notification
        const results = await dispatchNotification(request);

        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.status === 'sent').length;
        const failCount = results.filter(r => r.status === 'failed').length;

        log.info({
            notificationId: request.id,
            successCount,
            failCount,
            durationMs: duration,
        }, 'Notification processed');

        // Acknowledge message
        channel.ack(msg);

    } catch (error) {
        const duration = Date.now() - startTime;

        log.error({
            error,
            durationMs: duration,
        }, 'Error processing notification');

        // Retry logic
        const retryCount = getRetryCount(msg);
        if (retryCount < env.MAX_RETRY_ATTEMPTS) {
            log.info({ retryCount }, 'Requeuing for retry');

            // Wait before retry
            await delay(env.RETRY_DELAY_MS);
            channel.nack(msg, false, true);
        } else {
            log.warn({ retryCount }, 'Max retries reached, sending to DLQ');
            channel.nack(msg, false, false);
        }
    }
}

function getRetryCount(msg: ConsumeMessage): number {
    const deaths = msg.properties.headers?.['x-death'];
    if (Array.isArray(deaths) && deaths.length > 0) {
        return deaths[0].count || 0;
    }
    return 0;
}

// ============================================
// ERROR HANDLING
// ============================================

function handleConnectionError(error: Error): void {
    log.error({ error }, 'RabbitMQ connection error');
}

function handleConnectionClose(): void {
    log.warn('RabbitMQ connection closed');
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// PUBLISHING
// ============================================

/**
 * Publish notification to queue
 */
export async function publishNotification(
    request: NotificationMessage
): Promise<boolean> {
    if (!channel) {
        log.error('Channel not available');
        return false;
    }

    try {
        const content = Buffer.from(JSON.stringify(request));

        channel.sendToQueue(env.NOTIFICATIONS_QUEUE, content, {
            persistent: true,
            contentType: 'application/json',
            headers: {
                'x-notification-id': request.payload.id,
                'x-priority': request.payload.priority,
            },
        });

        log.debug({
            notificationId: request.payload.id,
        }, 'Notification published to queue');

        return true;

    } catch (error) {
        log.error({ error }, 'Failed to publish notification');
        return false;
    }
}
