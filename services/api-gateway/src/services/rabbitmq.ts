/**
 * RabbitMQ Service
 * Publishes messages for email verification and other notifications
 */

import * as amqp from 'amqplib';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';

const log = createLogger('RabbitMQ');

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

// Exchange and queue names
const EXCHANGE_NAME = 'neuraltrade.notifications';
const EMAIL_VERIFICATION_QUEUE = 'email.verification';

// ============================================
// CONNECTION MANAGEMENT
// ============================================

export async function connectRabbitMQ(): Promise<void> {
    if (channel) return;

    try {
        connection = await amqp.connect(env.RABBITMQ_URL);
        channel = await connection.createChannel();

        // Declare exchange
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        // Declare queue for email verification
        await channel.assertQueue(EMAIL_VERIFICATION_QUEUE, {
            durable: true,
            arguments: {
                'x-message-ttl': 86400000, // 24 hours
            },
        });

        // Bind queue to exchange
        await channel.bindQueue(EMAIL_VERIFICATION_QUEUE, EXCHANGE_NAME, 'email.verification');

        log.info('Connected to RabbitMQ');

        // Handle connection errors
        connection.on('error', (err) => {
            log.error({ err }, 'RabbitMQ connection error');
            channel = null;
            connection = null;
        });

        connection.on('close', () => {
            log.warn('RabbitMQ connection closed');
            channel = null;
            connection = null;
        });

    } catch (error) {
        log.error({ error }, 'Failed to connect to RabbitMQ');
        throw error;
    }
}

export async function disconnectRabbitMQ(): Promise<void> {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        log.info('Disconnected from RabbitMQ');
    } catch (error) {
        log.error({ error }, 'Error disconnecting from RabbitMQ');
    }
}

// ============================================
// MESSAGE PUBLISHING
// ============================================

export interface EmailVerificationMessage {
    type: 'email_verification';
    email: string;
    token: string;
    timestamp: Date;
}

export interface PasswordResetMessage {
    type: 'password_reset';
    email: string;
    token: string;
    timestamp: Date;
}

/**
 * Publish email verification request
 */
export async function publishEmailVerification(
    email: string,
    token: string
): Promise<void> {
    if (!channel) {
        await connectRabbitMQ();
    }

    if (!channel) {
        throw new Error('RabbitMQ channel not available');
    }

    const message: EmailVerificationMessage = {
        type: 'email_verification',
        email,
        token,
        timestamp: new Date(),
    };

    channel.publish(
        EXCHANGE_NAME,
        'email.verification',
        Buffer.from(JSON.stringify(message)),
        {
            persistent: true,
            contentType: 'application/json',
        }
    );

    log.info({ email }, 'Email verification message published');
}

/**
 * Publish password reset request
 */
export async function publishPasswordReset(
    email: string,
    token: string
): Promise<void> {
    if (!channel) {
        await connectRabbitMQ();
    }

    if (!channel) {
        throw new Error('RabbitMQ channel not available');
    }

    const message: PasswordResetMessage = {
        type: 'password_reset',
        email,
        token,
        timestamp: new Date(),
    };

    channel.publish(
        EXCHANGE_NAME,
        'email.password_reset',
        Buffer.from(JSON.stringify(message)),
        {
            persistent: true,
            contentType: 'application/json',
        }
    );

    log.info({ email }, 'Password reset message published');
}
