/**
 * Trading Types
 * Core type definitions for trading operations
 */

// ============================================
// ORDER TYPES
// ============================================

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit';
export type OrderStatus = 'pending' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'failed' | 'expired';
export type PositionSide = 'long' | 'short';

export interface Order {
    id: string;
    strategyId: string;
    userId: string;
    exchange: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    status: OrderStatus;
    price?: number;           // For limit orders
    stopPrice?: number;       // For stop orders
    amount: number;           // Quantity
    filled: number;           // Filled quantity
    remaining: number;        // Remaining quantity
    cost: number;             // Total cost (filled * avgPrice)
    avgPrice?: number;        // Average fill price
    fee?: OrderFee;
    exchangeOrderId?: string; // Exchange's order ID
    clientOrderId: string;    // Our internal ID
    dryRun: boolean;          // Paper trading
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    filledAt?: Date;
}

export interface OrderFee {
    cost: number;
    currency: string;
    rate?: number;
}

export interface OrderRequest {
    strategyId: string;
    userId: string;
    exchange: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    amount: number;
    price?: number;
    stopPrice?: number;
    dryRun?: boolean;
    reduceOnly?: boolean;
    postOnly?: boolean;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

// ============================================
// POSITION TYPES
// ============================================

export interface Position {
    id: string;
    strategyId: string;
    userId: string;
    exchange: string;
    symbol: string;
    side: PositionSide;
    status: 'open' | 'closed' | 'liquidated';

    // Size & Value
    size: number;             // Position size in base currency
    entryPrice: number;       // Average entry price
    currentPrice: number;     // Latest market price
    notionalValue: number;    // Size * currentPrice

    // P&L
    unrealizedPnl: number;    // Unrealized profit/loss
    unrealizedPnlPercent: number;
    realizedPnl: number;      // Realized P&L after closing

    // Risk Management
    leverage: number;
    liquidationPrice?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;

    // Tracking
    orders: string[];         // Related order IDs
    openedAt: Date;
    closedAt?: Date;
    updatedAt: Date;
}

export interface PositionUpdate {
    positionId: string;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    size?: number;           // For scaling in/out
}

// ============================================
// TRADE EXECUTION TYPES
// ============================================

export interface TradeSignal {
    id: string;
    strategyId: string;
    userId: string;
    symbol: string;
    exchange: string;
    direction: 'long' | 'short' | 'close';
    confidence: number;      // 0-1
    suggestedSize: number;   // As percentage of portfolio
    entryPrice?: number;     // Target entry (or market)
    stopLoss?: number;
    takeProfit?: number;
    metadata?: Record<string, unknown>;
    timestamp: Date;
    expiresAt?: Date;        // Signal validity
}

export interface TradeExecution {
    signalId: string;
    orderId: string;
    positionId?: string;
    status: 'success' | 'partial' | 'failed';
    executedPrice?: number;
    executedSize?: number;
    slippage?: number;       // In percentage
    error?: string;
    executedAt: Date;
}

// ============================================
// EXCHANGE TYPES
// ============================================

export type SupportedExchange = 'binance' | 'coinbase' | 'kraken' | 'bybit' | 'bitget';

export interface ExchangeCredentials {
    apiKey: string;
    apiSecret: string;
    passphrase?: string;     // For some exchanges like Coinbase
    sandbox?: boolean;
}

export interface ExchangeBalance {
    currency: string;
    free: number;
    used: number;
    total: number;
}

export interface ExchangeTicker {
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    volume24h: number;
    change24h: number;
    timestamp: Date;
}

export interface ExchangeMarket {
    symbol: string;
    base: string;
    quote: string;
    active: boolean;
    precision: {
        amount: number;
        price: number;
    };
    limits: {
        amount: { min: number; max: number };
        price: { min: number; max: number };
        cost: { min: number; max: number };
    };
    fees?: {
        maker: number;
        taker: number;
    };
}

// ============================================
// RISK MANAGEMENT TYPES
// ============================================

export interface RiskCheck {
    passed: boolean;
    checks: {
        maxPositionSize: { passed: boolean; message?: string };
        maxDailyLoss: { passed: boolean; message?: string };
        maxOpenPositions: { passed: boolean; message?: string };
        marginAvailable: { passed: boolean; message?: string };
        symbolAllowed: { passed: boolean; message?: string };
    };
    overallMessage?: string;
}

export interface RiskLimits {
    maxPositionSizePercent: number;   // Max position as % of portfolio
    maxPositionSizeUSD: number;       // Absolute max in USD
    maxDailyLossPercent: number;      // Max daily loss %
    maxOpenPositions: number;         // Max concurrent positions
    allowedSymbols?: string[];        // Whitelist (empty = all)
    blockedSymbols?: string[];        // Blacklist
    maxLeverage: number;
    requireStopLoss: boolean;
}

// ============================================
// MESSAGE QUEUE TYPES
// ============================================

export interface SignalMessage {
    type: 'trade_signal';
    payload: TradeSignal;
    timestamp: Date;
}

export interface OrderMessage {
    type: 'order_update' | 'order_filled' | 'order_cancelled' | 'order_failed';
    payload: Partial<Order>;
    timestamp: Date;
}

export interface PositionMessage {
    type: 'position_opened' | 'position_closed' | 'position_updated';
    payload: Partial<Position>;
    timestamp: Date;
}

export type TradingMessage = SignalMessage | OrderMessage | PositionMessage;

// ============================================
// CONFIGURATION
// ============================================

export interface TradingConfig {
    defaultRiskLimits: RiskLimits;
    orderRetryAttempts: number;
    orderRetryDelayMs: number;
    priceSlippageTolerancePercent: number;
    minConfidenceThreshold: number;
    enableDryRunFallback: boolean;     // Fall back to paper trading on errors
}
