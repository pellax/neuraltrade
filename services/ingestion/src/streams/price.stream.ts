/**
 * Price Streaming Manager
 * Orchestrates real-time data ingestion from exchanges
 */

import type { Exchange, Symbol, Ticker, Timeframe } from '@neuraltrade/shared-types';
import { ExchangeAdapter } from '../adapters/exchange.adapter.js';
import { MessagePublisher } from '../queue/publisher.js';
import { TimeSeriesWriter } from './influx.writer.js';
import { logger } from '../config/logger.js';

interface StreamSubscription {
    exchange: Exchange;
    symbol: Symbol;
    channels: ('ticker' | 'ohlcv')[];
    timeframe?: Timeframe;
    stopFn?: () => void;
}

export class PriceStreamer {
    private subscriptions: Map<string, StreamSubscription> = new Map();
    private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
    private readonly log = logger.child({ component: 'PriceStreamer' });

    constructor(
        private exchangeAdapter: ExchangeAdapter,
        private publisher: MessagePublisher,
        private tsWriter: TimeSeriesWriter
    ) { }

    /**
     * Generate subscription key
     */
    private getKey(exchange: Exchange, symbol: Symbol): string {
        return `${exchange}:${symbol}`;
    }

    /**
     * Subscribe to real-time ticker updates
     */
    async subscribeTicker(exchange: Exchange, symbol: Symbol): Promise<void> {
        const key = this.getKey(exchange, symbol);

        if (this.subscriptions.has(key)) {
            this.log.warn({ key }, 'Already subscribed');
            return;
        }

        try {
            // Ensure exchange is connected
            await this.exchangeAdapter.connect(exchange, true);

            // Handle ticker callback
            const onTicker = async (ticker: Ticker) => {
                try {
                    // Publish to RabbitMQ
                    await this.publisher.publishTicker(ticker);

                    // Write to InfluxDB
                    this.tsWriter.writeTicker(ticker);

                    this.log.trace({
                        exchange,
                        symbol,
                        price: ticker.last
                    }, 'Ticker processed');
                } catch (err) {
                    this.log.error({ err, exchange, symbol }, 'Error processing ticker');
                }
            };

            // Start WebSocket stream
            const stopFn = await this.exchangeAdapter.watchTicker(exchange, symbol, onTicker);

            this.subscriptions.set(key, {
                exchange,
                symbol,
                channels: ['ticker'],
                stopFn,
            });

            this.log.info({ exchange, symbol }, 'Ticker subscription active');
        } catch (err) {
            this.log.error({ err, exchange, symbol }, 'Failed to subscribe ticker');
            throw err;
        }
    }

    /**
     * Subscribe to OHLCV candle updates (polling-based)
     */
    async subscribeOHLCV(
        exchange: Exchange,
        symbol: Symbol,
        timeframe: Timeframe = '1m',
        pollIntervalMs = 60000
    ): Promise<void> {
        const key = `${this.getKey(exchange, symbol)}:ohlcv:${timeframe}`;

        if (this.pollIntervals.has(key)) {
            this.log.warn({ key }, 'Already polling OHLCV');
            return;
        }

        await this.exchangeAdapter.connect(exchange, true);

        // Initial fetch
        await this.fetchAndPublishOHLCV(exchange, symbol, timeframe);

        // Setup polling
        const interval = setInterval(async () => {
            await this.fetchAndPublishOHLCV(exchange, symbol, timeframe);
        }, pollIntervalMs);

        this.pollIntervals.set(key, interval);
        this.log.info({ exchange, symbol, timeframe, pollIntervalMs }, 'OHLCV polling active');
    }

    /**
     * Fetch and publish OHLCV data
     */
    private async fetchAndPublishOHLCV(
        exchange: Exchange,
        symbol: Symbol,
        timeframe: Timeframe
    ): Promise<void> {
        try {
            const candles = await this.exchangeAdapter.fetchOHLCV(exchange, symbol, timeframe, 100);

            // Publish to RabbitMQ
            await this.publisher.publishOHLCV(exchange, symbol, candles);

            // Write to InfluxDB
            this.tsWriter.writeOHLCVBatch(exchange, symbol, timeframe, candles);

            // Flush writes periodically
            await this.tsWriter.flush();

            this.log.debug({ exchange, symbol, timeframe, count: candles.length }, 'OHLCV fetched');
        } catch (err) {
            this.log.error({ err, exchange, symbol, timeframe }, 'Failed to fetch OHLCV');
        }
    }

    /**
     * Unsubscribe from a market feed
     */
    unsubscribe(exchange: Exchange, symbol: Symbol): void {
        const key = this.getKey(exchange, symbol);

        const sub = this.subscriptions.get(key);
        if (sub?.stopFn) {
            sub.stopFn();
        }
        this.subscriptions.delete(key);

        // Clear any OHLCV polling intervals
        for (const [pollKey, interval] of this.pollIntervals) {
            if (pollKey.startsWith(key)) {
                clearInterval(interval);
                this.pollIntervals.delete(pollKey);
            }
        }

        this.log.info({ exchange, symbol }, 'Unsubscribed');
    }

    /**
     * Unsubscribe from all feeds
     */
    unsubscribeAll(): void {
        for (const sub of this.subscriptions.values()) {
            sub.stopFn?.();
        }
        this.subscriptions.clear();

        for (const interval of this.pollIntervals.values()) {
            clearInterval(interval);
        }
        this.pollIntervals.clear();

        this.log.info('All subscriptions cleared');
    }

    /**
     * Get active subscriptions
     */
    getActiveSubscriptions(): StreamSubscription[] {
        return Array.from(this.subscriptions.values());
    }
}
