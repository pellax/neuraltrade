/**
 * Signal Consumer Worker
 * Processes trading signals from RabbitMQ
 */

import amqp from 'amqplib';
import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { executeSignal } from '../services/executor.js';
import type { TradeSignal, ExchangeCredentials, SignalMessage } from '../types/index.js';

const log = createLogger('SignalWorker');

let connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
let channel: Channel | null = null;

// Mock credentials store (in production, would fetch from API Gateway)
const credentialsStore: Map<string, { exchange: string; credentials: ExchangeCredentials }[]> = new Map();

// ============================================
// CONNECTION
// ============================================

export async function startSignalWorker(): Promise<void> {
    try {
        log.info('Starting signal worker...');

        // Connect to RabbitMQ
        connection = await amqp.connect(env.RABBITMQ_URL);
        channel = await connection.createChannel();

        // Setup dead letter exchange for failed messages
        await channel.assertExchange('trading.dlx', 'direct', { durable: true });
        await channel.assertQueue('trading.signals.dlq', {
            durable: true,
            arguments: { 'x-message-ttl': 86400000 }, // 24h retention
        });
        await channel.bindQueue('trading.signals.dlq', 'trading.dlx', env.SIGNALS_QUEUE);

        // Setup main queue
        await channel.assertQueue(env.SIGNALS_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'trading.dlx',
                'x-dead-letter-routing-key': env.SIGNALS_QUEUE,
            },
        });

        // Set prefetch for controlled concurrency
        await channel.prefetch(5);

        // Start consuming
        await channel.consume(env.SIGNALS_QUEUE, handleSignalMessage, {
            noAck: false,
        });

        log.info({ queue: env.SIGNALS_QUEUE }, 'Signal worker started, waiting for messages...');

        // Handle connection events
        connection.on('error', handleConnectionError);
        connection.on('close', handleConnectionClose);

    } catch (error) {
        log.error({ error }, 'Failed to start signal worker');
        throw error;
    }
}

export async function stopSignalWorker(): Promise<void> {
    log.info('Stopping signal worker...');

    if (channel) {
        await channel.close();
        channel = null;
    }

    if (connection) {
        await connection.close();
        connection = null;
    }

    log.info('Signal worker stopped');
}

// ============================================
// MESSAGE HANDLING
// ============================================

async function handleSignalMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !channel) return;

    const startTime = Date.now();

    try {
        // Parse message
        const content = JSON.parse(msg.content.toString()) as SignalMessage;

        if (content.type !== 'trade_signal') {
            log.warn({ type: content.type }, 'Unknown message type, discarding');
            channel.ack(msg);
            return;
        }

        const signal = content.payload;

        log.info({
            signalId: signal.id,
            symbol: signal.symbol,
            direction: signal.direction,
            confidence: signal.confidence,
        }, 'Processing signal');

        // Get credentials for user/exchange
        const credentials = await getCredentialsForSignal(signal);

        if (!credentials) {
            log.error({
                signalId: signal.id,
                userId: signal.userId,
                exchange: signal.exchange,
            }, 'No credentials found for signal');
            channel.nack(msg, false, false); // Send to DLQ
            return;
        }

        // Execute the signal
        const execution = await executeSignal(signal, credentials);

        // Publish execution result
        await publishExecutionResult(execution);

        const duration = Date.now() - startTime;

        log.info({
            signalId: signal.id,
            orderId: execution.orderId,
            status: execution.status,
            durationMs: duration,
        }, 'Signal processed');

        // Acknowledge message
        channel.ack(msg);

    } catch (error) {
        const duration = Date.now() - startTime;

        log.error({
            error,
            durationMs: duration,
        }, 'Error processing signal');

        // Retry a few times, then send to DLQ
        const retryCount = getRetryCount(msg);
        if (retryCount < 3) {
            log.info({ retryCount }, 'Requeuing message for retry');
            channel.nack(msg, false, true); // Requeue
        } else {
            log.warn({ retryCount }, 'Max retries reached, sending to DLQ');
            channel.nack(msg, false, false); // Send to DLQ
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
// CREDENTIALS (MOCK)
// ============================================

/**
 * Get credentials for a signal
 * In production, this would call the API Gateway to fetch decrypted credentials
 */
async function getCredentialsForSignal(
    signal: TradeSignal
): Promise<ExchangeCredentials | null> {
    // In production, would make HTTP call to API Gateway:
    // const response = await fetch(`${API_GATEWAY_URL}/internal/credentials/${userId}/${exchange}`);

    // For now, check local store or return sandbox credentials
    const userCreds = credentialsStore.get(signal.userId);
    const exchangeCreds = userCreds?.find(c => c.exchange === signal.exchange);

    if (exchangeCreds) {
        return exchangeCreds.credentials;
    }

    // Return sandbox credentials for testing
    log.warn({ userId: signal.userId, exchange: signal.exchange }, 'Using sandbox mode');
    return {
        apiKey: 'sandbox',
        apiSecret: 'sandbox',
        sandbox: true,
    };
}

/**
 * Register credentials for a user (for testing)
 */
export function registerCredentials(
    userId: string,
    exchange: string,
    credentials: ExchangeCredentials
): void {
    const existing = credentialsStore.get(userId) || [];
    existing.push({ exchange, credentials });
    credentialsStore.set(userId, existing);
}

// ============================================
// PUBLISHING
// ============================================

async function publishExecutionResult(execution: any): Promise<void> {
    if (!channel) return;

    try {
        await channel.assertExchange(env.POSITIONS_EXCHANGE, 'topic', { durable: true });

        const routingKey = `execution.${execution.status}`;
        const content = Buffer.from(JSON.stringify({
            type: 'execution_result',
            payload: execution,
            timestamp: new Date(),
        }));

        channel.publish(env.POSITIONS_EXCHANGE, routingKey, content, {
            persistent: true,
            contentType: 'application/json',
        });

    } catch (error) {
        log.error({ error }, 'Failed to publish execution result');
    }
}

// ============================================
// ERROR HANDLING
// ============================================

function handleConnectionError(error: Error): void {
    log.error({ error }, 'RabbitMQ connection error');
}

function handleConnectionClose(): void {
    log.warn('RabbitMQ connection closed');
    // In production, would implement reconnection logic
}
