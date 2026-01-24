/**
 * Market Data Types
 * Shared across Ingestion, ML Engine, and Backtesting services
 */

/** Supported cryptocurrency exchanges */
export type Exchange =
    | 'binance'
    | 'coinbase'
    | 'kraken'
    | 'bybit'
    | 'okx'
    | 'kucoin';

/** Trading pair symbol (e.g., BTC/USDT) */
export type Symbol = string;

/** OHLCV candlestick data */
export interface OHLCV {
    timestamp: number;      // Unix timestamp in milliseconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/** Real-time ticker data */
export interface Ticker {
    exchange: Exchange;
    symbol: Symbol;
    bid: number;
    ask: number;
    last: number;
    volume24h: number;
    timestamp: number;
}

/** Order book depth entry */
export interface OrderBookEntry {
    price: number;
    amount: number;
}

/** Full order book snapshot */
export interface OrderBook {
    exchange: Exchange;
    symbol: Symbol;
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    timestamp: number;
}

/** Timeframes for candlestick data */
export type Timeframe =
    | '1m' | '3m' | '5m' | '15m' | '30m'
    | '1h' | '2h' | '4h' | '6h' | '12h'
    | '1d' | '1w' | '1M';

/** Market data subscription request */
export interface MarketSubscription {
    exchange: Exchange;
    symbol: Symbol;
    channels: ('ticker' | 'orderbook' | 'ohlcv')[];
    timeframe?: Timeframe;
}

/** Trade execution record */
export interface Trade {
    id: string;
    exchange: Exchange;
    symbol: Symbol;
    side: 'buy' | 'sell';
    price: number;
    amount: number;
    cost: number;
    fee: number;
    feeCurrency: string;
    timestamp: number;
}
