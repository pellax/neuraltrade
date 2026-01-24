/**
 * RabbitMQ Message Publisher
 * Publishes market data events to the message broker
 */

import amqplib, { Channel, Connection } from 'amqplib';
import type { Ticker, OHLCV, OrderBook } from '@neuraltrade/shared-types';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

interface QueueMessage {
    type: 'TICKER' | 'OHLCV' | 'ORDERBOOK';
    payload: Ticker | OHLCV[] | OrderBook;
    timestamp: number;
    correlationId?: string;
}

export class MessagePublisher {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private readonly log = logger.child({ component: 'MessagePublisher' });
    private reconnecting = false;

    /**
     * Connect to RabbitMQ
     */
    async connect(): Promise<void> {
        try {
            this.connection = await amqplib.connect(env.RABBITMQ_URL);
            this.channel = await this.connection.createChannel();

            // Declare exchange
            await this.channel.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', {
                durable: true,
            });

            // Declare queue
            await this.channel.assertQueue(env.RABBITMQ_QUEUE_PRICES, {
                durable: true,
                arguments: {
                    'x-message-ttl': 60000, // 1 minute TTL
                },
            });

            // Bind queue to exchange
            await this.channel.bindQueue(
                env.RABBITMQ_QUEUE_PRICES,
                env.RABBITMQ_EXCHANGE,
                'market.#'
            );

            // Handle connection errors
            this.connection.on('error', this.handleError.bind(this));
            this.connection.on('close', this.handleClose.bind(this));

            this.log.info('Connected to RabbitMQ');
        } catch (err) {
            this.log.error({ err }, 'Failed to connect to RabbitMQ');
            throw err;
        }
    }

    private handleError(err: Error): void {
        this.log.error({ err }, 'RabbitMQ connection error');
        this.reconnect();
    }

    private handleClose(): void {
        this.log.warn('RabbitMQ connection closed');
        this.reconnect();
    }

    private async reconnect(): Promise<void> {
        if (this.reconnecting) return;

        this.reconnecting = true;
        this.log.info('Attempting RabbitMQ reconnection...');

        let attempts = 0;
        const maxAttempts = 10;
        const delay = 5000;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                await this.connect();
                this.reconnecting = false;
                this.log.info({ attempts }, 'Reconnected to RabbitMQ');
                return;
            } catch {
                this.log.warn({ attempt: attempts, maxAttempts }, 'Reconnection attempt failed');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        this.log.error('Max reconnection attempts reached');
        process.exit(1);
    }

    /**
     * Publish ticker update
     */
    async publishTicker(ticker: Ticker): Promise<void> {
        const routingKey = `market.ticker.${ticker.exchange}.${ticker.symbol.replace('/', '-')}`;
        await this.publish(routingKey, {
            type: 'TICKER',
            payload: ticker,
            timestamp: Date.now(),
        });
    }

    /**
     * Publish OHLCV candles
     */
    async publishOHLCV(exchange: string, symbol: string, candles: OHLCV[]): Promise<void> {
        const routingKey = `market.ohlcv.${exchange}.${symbol.replace('/', '-')}`;
        await this.publish(routingKey, {
            type: 'OHLCV',
            payload: candles,
            timestamp: Date.now(),
        });
    }

    /**
     * Publish order book update
     */
    async publishOrderBook(orderBook: OrderBook): Promise<void> {
        const routingKey = `market.orderbook.${orderBook.exchange}.${orderBook.symbol.replace('/', '-')}`;
        await this.publish(routingKey, {
            type: 'ORDERBOOK',
            payload: orderBook,
            timestamp: Date.now(),
        });
    }

    /**
     * Generic publish method
     */
    private async publish(routingKey: string, message: QueueMessage): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not initialized');
        }

        const content = Buffer.from(JSON.stringify(message));

        this.channel.publish(env.RABBITMQ_EXCHANGE, routingKey, content, {
            persistent: true,
            contentType: 'application/json',
            timestamp: Date.now(),
        });

        this.log.debug({ routingKey, type: message.type }, 'Message published');
    }

    /**
     * Disconnect from RabbitMQ
     */
    async disconnect(): Promise<void> {
        try {
            await this.channel?.close();
            await this.connection?.close();
            this.channel = null;
            this.connection = null;
            this.log.info('Disconnected from RabbitMQ');
        } catch (err) {
            this.log.error({ err }, 'Error disconnecting from RabbitMQ');
        }
    }
}
