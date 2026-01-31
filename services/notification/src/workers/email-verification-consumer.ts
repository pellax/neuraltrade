/**
 * Email Verification Worker
 * Consumes email verification and password reset requests from RabbitMQ
 */

import amqp from 'amqplib';
import type { Channel, ConsumeMessage } from 'amqplib';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

const log = createLogger('EmailVerificationWorker');

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Channel | null = null;

// ============================================
// TYPES
// ============================================

interface EmailVerificationMessage {
    type: 'email_verification';
    email: string;
    token: string;
    timestamp: Date;
}

interface PasswordResetMessage {
    type: 'password_reset';
    email: string;
    token: string;
    timestamp: Date;
}

type EmailMessage = EmailVerificationMessage | PasswordResetMessage;

// ============================================
// CONNECTION
// ============================================

const EXCHANGE_NAME = 'neuraltrade.notifications';
const VERIFICATION_QUEUE = 'email.verification';
const PASSWORD_RESET_QUEUE = 'email.password_reset';

export async function startEmailVerificationWorker(): Promise<void> {
    try {
        log.info('Starting email verification worker...');

        // Connect to RabbitMQ
        connection = await amqp.connect(env.RABBITMQ_URL);
        channel = await connection.createChannel();

        // Declare exchange
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        // Declare and bind verification queue
        await channel.assertQueue(VERIFICATION_QUEUE, {
            durable: true,
            arguments: {
                'x-message-ttl': 86400000, // 24 hours
            },
        });
        await channel.bindQueue(VERIFICATION_QUEUE, EXCHANGE_NAME, 'email.verification');

        // Declare and bind password reset queue
        await channel.assertQueue(PASSWORD_RESET_QUEUE, {
            durable: true,
            arguments: {
                'x-message-ttl': 3600000, // 1 hour
            },
        });
        await channel.bindQueue(PASSWORD_RESET_QUEUE, EXCHANGE_NAME, 'email.password_reset');

        // Set prefetch
        await channel.prefetch(5);

        // Start consuming verification queue
        await channel.consume(VERIFICATION_QUEUE, handleVerificationMessage, {
            noAck: false,
        });

        // Start consuming password reset queue
        await channel.consume(PASSWORD_RESET_QUEUE, handlePasswordResetMessage, {
            noAck: false,
        });

        log.info({
            verificationQueue: VERIFICATION_QUEUE,
            passwordResetQueue: PASSWORD_RESET_QUEUE,
        }, 'Email verification worker started');

        // Handle connection events
        connection.on('error', handleConnectionError);
        connection.on('close', handleConnectionClose);

    } catch (error) {
        log.error({ error }, 'Failed to start email verification worker');
        throw error;
    }
}

export async function stopEmailVerificationWorker(): Promise<void> {
    log.info('Stopping email verification worker...');

    if (channel) {
        await channel.close();
        channel = null;
    }

    if (connection) {
        await connection.close();
        connection = null;
    }

    log.info('Email verification worker stopped');
}

// ============================================
// MESSAGE HANDLING
// ============================================

async function handleVerificationMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !channel) return;

    try {
        const content = JSON.parse(msg.content.toString()) as EmailVerificationMessage;

        if (content.type !== 'email_verification') {
            log.warn({ type: content.type }, 'Unknown message type in verification queue');
            channel.ack(msg);
            return;
        }

        log.info({ email: content.email }, 'Processing email verification request');

        const success = await sendVerificationEmail(content.email, content.token);

        if (success) {
            log.info({ email: content.email }, 'Verification email sent successfully');
            channel.ack(msg);
        } else {
            log.warn({ email: content.email }, 'Failed to send verification email, will retry');
            // Retry up to 3 times
            const retryCount = getRetryCount(msg);
            if (retryCount < 3) {
                await delay(5000);
                channel.nack(msg, false, true);
            } else {
                log.error({ email: content.email }, 'Max retries reached for verification email');
                channel.ack(msg); // Acknowledge to prevent infinite loop
            }
        }

    } catch (error) {
        log.error({ error }, 'Error processing verification message');
        channel.ack(msg); // Acknowledge to prevent poison message
    }
}

async function handlePasswordResetMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !channel) return;

    try {
        const content = JSON.parse(msg.content.toString()) as PasswordResetMessage;

        if (content.type !== 'password_reset') {
            log.warn({ type: content.type }, 'Unknown message type in password reset queue');
            channel.ack(msg);
            return;
        }

        log.info({ email: content.email }, 'Processing password reset request');

        const success = await sendPasswordResetEmail(content.email, content.token);

        if (success) {
            log.info({ email: content.email }, 'Password reset email sent successfully');
            channel.ack(msg);
        } else {
            log.warn({ email: content.email }, 'Failed to send password reset email, will retry');
            const retryCount = getRetryCount(msg);
            if (retryCount < 3) {
                await delay(5000);
                channel.nack(msg, false, true);
            } else {
                log.error({ email: content.email }, 'Max retries reached for password reset email');
                channel.ack(msg);
            }
        }

    } catch (error) {
        log.error({ error }, 'Error processing password reset message');
        channel.ack(msg);
    }
}

// ============================================
// HELPERS
// ============================================

function getRetryCount(msg: ConsumeMessage): number {
    const deaths = msg.properties.headers?.['x-death'];
    if (Array.isArray(deaths) && deaths.length > 0) {
        return deaths[0].count || 0;
    }
    return 0;
}

function handleConnectionError(error: Error): void {
    log.error({ error }, 'RabbitMQ connection error in email worker');
}

function handleConnectionClose(): void {
    log.warn('RabbitMQ connection closed in email worker');
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
