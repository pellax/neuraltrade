/**
 * Zod Validation Schemas for Market Data
 * Ensures all incoming data meets strict type requirements
 */

import { z } from 'zod';
import type { Exchange, Timeframe } from '@neuraltrade/shared-types';

// Supported exchanges
export const exchangeSchema = z.enum([
    'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin'
]);

// Timeframe validation
export const timeframeSchema = z.enum([
    '1m', '3m', '5m', '15m', '30m',
    '1h', '2h', '4h', '6h', '12h',
    '1d', '1w', '1M'
]);

// OHLCV candle validation
export const ohlcvSchema = z.object({
    timestamp: z.number().int().positive(),
    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    volume: z.number().nonnegative(),
}).refine(
    (data) => data.high >= data.low && data.high >= data.open && data.high >= data.close,
    { message: 'High must be highest value' }
).refine(
    (data) => data.low <= data.open && data.low <= data.close,
    { message: 'Low must be lowest value' }
);

// Ticker validation
export const tickerSchema = z.object({
    exchange: exchangeSchema,
    symbol: z.string().regex(/^[A-Z0-9]+\/[A-Z0-9]+$/, 'Invalid symbol format (expected: BTC/USDT)'),
    bid: z.number().positive(),
    ask: z.number().positive(),
    last: z.number().positive(),
    volume24h: z.number().nonnegative(),
    timestamp: z.number().int().positive(),
}).refine(
    (data) => data.ask >= data.bid,
    { message: 'Ask must be >= Bid' }
);

// Order book entry validation
export const orderBookEntrySchema = z.object({
    price: z.number().positive(),
    amount: z.number().positive(),
});

// Full order book validation
export const orderBookSchema = z.object({
    exchange: exchangeSchema,
    symbol: z.string().regex(/^[A-Z0-9]+\/[A-Z0-9]+$/),
    bids: z.array(orderBookEntrySchema).min(1),
    asks: z.array(orderBookEntrySchema).min(1),
    timestamp: z.number().int().positive(),
});

// Subscription request validation
export const subscriptionSchema = z.object({
    exchange: exchangeSchema,
    symbol: z.string().regex(/^[A-Z0-9]+\/[A-Z0-9]+$/),
    channels: z.array(z.enum(['ticker', 'orderbook', 'ohlcv'])).min(1),
    timeframe: timeframeSchema.optional(),
});

// Batch ticker array
export const tickerBatchSchema = z.array(tickerSchema);

// Types
export type ValidatedOHLCV = z.infer<typeof ohlcvSchema>;
export type ValidatedTicker = z.infer<typeof tickerSchema>;
export type ValidatedOrderBook = z.infer<typeof orderBookSchema>;
export type ValidatedSubscription = z.infer<typeof subscriptionSchema>;
