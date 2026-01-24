/**
 * CCXT Exchange Adapter
 * Unified interface for multiple cryptocurrency exchanges
 */

import ccxt, { Exchange as CCXTExchange } from 'ccxt';
import type { Exchange, Symbol, OHLCV, Ticker, OrderBook, Timeframe } from '@neuraltrade/shared-types';
import { logger } from '../config/logger.js';
import { tickerSchema, ohlcvSchema, orderBookSchema } from '../validators/tick.schema.js';

// Map our exchange names to CCXT exchange classes
const EXCHANGE_MAP: Record<Exchange, new (config?: object) => CCXTExchange> = {
    binance: ccxt.binance,
    coinbase: ccxt.coinbase,
    kraken: ccxt.kraken,
    bybit: ccxt.bybit,
    okx: ccxt.okx,
    kucoin: ccxt.kucoin,
};

export class ExchangeAdapter {
    private exchanges: Map<Exchange, CCXTExchange> = new Map();
    private readonly log = logger.child({ component: 'ExchangeAdapter' });

    /**
     * Initialize connection to an exchange
     */
    async connect(exchangeId: Exchange, sandbox = true): Promise<void> {
        if (this.exchanges.has(exchangeId)) {
            this.log.warn({ exchange: exchangeId }, 'Exchange already connected');
            return;
        }

        const ExchangeClass = EXCHANGE_MAP[exchangeId];
        if (!ExchangeClass) {
            throw new Error(`Unsupported exchange: ${exchangeId}`);
        }

        const exchange = new ExchangeClass({
            enableRateLimit: true,
            sandbox,
        });

        // Load markets
        await exchange.loadMarkets();

        this.exchanges.set(exchangeId, exchange);
        this.log.info({
            exchange: exchangeId,
            markets: Object.keys(exchange.markets).length,
            sandbox
        }, 'Exchange connected');
    }

    /**
     * Get exchange instance
     */
    private getExchange(exchangeId: Exchange): CCXTExchange {
        const exchange = this.exchanges.get(exchangeId);
        if (!exchange) {
            throw new Error(`Exchange not connected: ${exchangeId}`);
        }
        return exchange;
    }

    /**
     * Fetch current ticker for a symbol
     */
    async fetchTicker(exchangeId: Exchange, symbol: Symbol): Promise<Ticker> {
        const exchange = this.getExchange(exchangeId);
        const raw = await exchange.fetchTicker(symbol);

        const ticker: Ticker = {
            exchange: exchangeId,
            symbol,
            bid: raw.bid ?? 0,
            ask: raw.ask ?? 0,
            last: raw.last ?? 0,
            volume24h: raw.baseVolume ?? 0,
            timestamp: raw.timestamp ?? Date.now(),
        };

        // Validate
        const result = tickerSchema.safeParse(ticker);
        if (!result.success) {
            this.log.error({ errors: result.error.errors }, 'Invalid ticker data');
            throw new Error('Ticker validation failed');
        }

        return result.data;
    }

    /**
     * Fetch OHLCV candles
     */
    async fetchOHLCV(
        exchangeId: Exchange,
        symbol: Symbol,
        timeframe: Timeframe = '1h',
        limit = 100
    ): Promise<OHLCV[]> {
        const exchange = this.getExchange(exchangeId);
        const raw = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);

        const candles: OHLCV[] = raw.map(([timestamp, open, high, low, close, volume]) => ({
            timestamp: timestamp as number,
            open: open as number,
            high: high as number,
            low: low as number,
            close: close as number,
            volume: volume as number,
        }));

        // Validate each candle
        const validated: OHLCV[] = [];
        for (const candle of candles) {
            const result = ohlcvSchema.safeParse(candle);
            if (result.success) {
                validated.push(result.data);
            } else {
                this.log.warn({ candle, errors: result.error.errors }, 'Invalid OHLCV candle');
            }
        }

        return validated;
    }

    /**
     * Fetch order book
     */
    async fetchOrderBook(
        exchangeId: Exchange,
        symbol: Symbol,
        limit = 20
    ): Promise<OrderBook> {
        const exchange = this.getExchange(exchangeId);
        const raw = await exchange.fetchOrderBook(symbol, limit);

        const orderBook: OrderBook = {
            exchange: exchangeId,
            symbol,
            bids: raw.bids.map(([price, amount]) => ({ price, amount })),
            asks: raw.asks.map(([price, amount]) => ({ price, amount })),
            timestamp: raw.timestamp ?? Date.now(),
        };

        const result = orderBookSchema.safeParse(orderBook);
        if (!result.success) {
            this.log.error({ errors: result.error.errors }, 'Invalid order book');
            throw new Error('OrderBook validation failed');
        }

        return result.data;
    }

    /**
     * Watch real-time ticker via WebSocket (if supported)
     */
    async watchTicker(
        exchangeId: Exchange,
        symbol: Symbol,
        callback: (ticker: Ticker) => void
    ): Promise<() => void> {
        const exchange = this.getExchange(exchangeId);

        if (!exchange.has['watchTicker']) {
            throw new Error(`Exchange ${exchangeId} does not support WebSocket ticker`);
        }

        let running = true;

        const watch = async () => {
            while (running) {
                try {
                    const raw = await exchange.watchTicker(symbol);

                    const ticker: Ticker = {
                        exchange: exchangeId,
                        symbol,
                        bid: raw.bid ?? 0,
                        ask: raw.ask ?? 0,
                        last: raw.last ?? 0,
                        volume24h: raw.baseVolume ?? 0,
                        timestamp: raw.timestamp ?? Date.now(),
                    };

                    const result = tickerSchema.safeParse(ticker);
                    if (result.success) {
                        callback(result.data);
                    }
                } catch (err) {
                    if (running) {
                        this.log.error({ err, exchange: exchangeId, symbol }, 'WebSocket error');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
        };

        watch();

        return () => {
            running = false;
        };
    }

    /**
     * Disconnect from an exchange
     */
    async disconnect(exchangeId: Exchange): Promise<void> {
        const exchange = this.exchanges.get(exchangeId);
        if (exchange) {
            await exchange.close?.();
            this.exchanges.delete(exchangeId);
            this.log.info({ exchange: exchangeId }, 'Exchange disconnected');
        }
    }

    /**
     * Disconnect all exchanges
     */
    async disconnectAll(): Promise<void> {
        const exchanges = Array.from(this.exchanges.keys());
        await Promise.all(exchanges.map(id => this.disconnect(id)));
    }
}
