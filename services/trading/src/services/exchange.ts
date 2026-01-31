/**
 * Exchange Service
 * Unified exchange interface using CCXT
 */

import ccxt, { Exchange, Order as CCXTOrder, Balances, Ticker, Market } from 'ccxt';
import Decimal from 'decimal.js';
import { createLogger } from '../utils/logger.js';
import type {
    SupportedExchange,
    ExchangeCredentials,
    ExchangeBalance,
    ExchangeTicker,
    ExchangeMarket,
    OrderRequest,
    Order,
    OrderStatus,
    OrderFee,
} from '../types/index.js';

const log = createLogger('ExchangeService');

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN });

// ============================================
// EXCHANGE CLIENT POOL
// ============================================

const exchangeClients: Map<string, Exchange> = new Map();

/**
 * Create or get cached exchange client
 */
export function getExchangeClient(
    exchange: SupportedExchange,
    credentials: ExchangeCredentials
): Exchange {
    const cacheKey = `${exchange}:${credentials.apiKey.slice(0, 8)}`;

    if (exchangeClients.has(cacheKey)) {
        return exchangeClients.get(cacheKey)!;
    }

    const ExchangeClass = getExchangeClass(exchange);

    const client = new ExchangeClass({
        apiKey: credentials.apiKey,
        secret: credentials.apiSecret,
        password: credentials.passphrase,
        sandbox: credentials.sandbox ?? false,
        enableRateLimit: true,
        options: {
            defaultType: 'spot',
            adjustForTimeDifference: true,
        },
    });

    exchangeClients.set(cacheKey, client);
    log.info({ exchange, sandbox: credentials.sandbox }, 'Exchange client created');

    return client;
}

/**
 * Get CCXT exchange class
 */
function getExchangeClass(exchange: SupportedExchange): typeof Exchange {
    const exchangeMap: Record<SupportedExchange, typeof Exchange> = {
        binance: ccxt.binance,
        coinbase: ccxt.coinbase,
        kraken: ccxt.kraken,
        bybit: ccxt.bybit,
        bitget: ccxt.bitget,
    };

    const ExchangeClass = exchangeMap[exchange];
    if (!ExchangeClass) {
        throw new Error(`Unsupported exchange: ${exchange}`);
    }

    return ExchangeClass;
}

// ============================================
// MARKET DATA
// ============================================

/**
 * Get account balances
 */
export async function getBalances(
    client: Exchange
): Promise<ExchangeBalance[]> {
    try {
        const balances: Balances = await client.fetchBalance();
        const result: ExchangeBalance[] = [];

        for (const [currency, balance] of Object.entries(balances)) {
            if (typeof balance === 'object' && balance && 'free' in balance) {
                const b = balance as { free: number; used: number; total: number };
                if (b.total > 0) {
                    result.push({
                        currency,
                        free: b.free,
                        used: b.used,
                        total: b.total,
                    });
                }
            }
        }

        return result;
    } catch (error) {
        log.error({ error }, 'Failed to fetch balances');
        throw error;
    }
}

/**
 * Get ticker for a symbol
 */
export async function getTicker(
    client: Exchange,
    symbol: string
): Promise<ExchangeTicker> {
    try {
        const ticker: Ticker = await client.fetchTicker(symbol);

        return {
            symbol: ticker.symbol,
            bid: ticker.bid ?? 0,
            ask: ticker.ask ?? 0,
            last: ticker.last ?? 0,
            volume24h: ticker.baseVolume ?? 0,
            change24h: ticker.percentage ?? 0,
            timestamp: new Date(ticker.timestamp ?? Date.now()),
        };
    } catch (error) {
        log.error({ error, symbol }, 'Failed to fetch ticker');
        throw error;
    }
}

/**
 * Get market information
 */
export async function getMarket(
    client: Exchange,
    symbol: string
): Promise<ExchangeMarket | null> {
    try {
        await client.loadMarkets();
        const market: Market = client.market(symbol);

        if (!market) return null;

        return {
            symbol: market.symbol,
            base: market.base,
            quote: market.quote,
            active: market.active ?? true,
            precision: {
                amount: market.precision?.amount ?? 8,
                price: market.precision?.price ?? 8,
            },
            limits: {
                amount: {
                    min: market.limits?.amount?.min ?? 0,
                    max: market.limits?.amount?.max ?? Infinity,
                },
                price: {
                    min: market.limits?.price?.min ?? 0,
                    max: market.limits?.price?.max ?? Infinity,
                },
                cost: {
                    min: market.limits?.cost?.min ?? 0,
                    max: market.limits?.cost?.max ?? Infinity,
                },
            },
            fees: market.maker && market.taker
                ? { maker: market.maker, taker: market.taker }
                : undefined,
        };
    } catch (error) {
        log.error({ error, symbol }, 'Failed to get market');
        return null;
    }
}

// ============================================
// ORDER EXECUTION
// ============================================

/**
 * Place an order on the exchange
 */
export async function placeOrder(
    client: Exchange,
    request: OrderRequest
): Promise<Order> {
    const clientOrderId = request.strategyId
        ? `NT_${request.strategyId.slice(0, 8)}_${Date.now()}`
        : `NT_${Date.now()}`;

    log.info({
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        amount: request.amount,
        price: request.price,
        dryRun: request.dryRun,
    }, 'Placing order');

    try {
        // Validate market exists
        await client.loadMarkets();
        const market = client.market(request.symbol);

        if (!market || !market.active) {
            throw new Error(`Market ${request.symbol} is not active`);
        }

        // Format amount according to market precision
        const amount = formatAmount(request.amount, market.precision?.amount ?? 8);
        const price = request.price
            ? formatPrice(request.price, market.precision?.price ?? 8)
            : undefined;

        // Build order params
        const params: Record<string, unknown> = {
            clientOrderId,
        };

        if (request.reduceOnly) params.reduceOnly = true;
        if (request.postOnly) params.postOnly = true;
        if (request.timeInForce) params.timeInForce = request.timeInForce;
        if (request.stopPrice) params.stopPrice = request.stopPrice;

        // Execute order
        let ccxtOrder: CCXTOrder;

        if (request.type === 'market') {
            ccxtOrder = await client.createMarketOrder(
                request.symbol,
                request.side,
                amount,
                price,
                params
            );
        } else if (request.type === 'limit') {
            if (!price) throw new Error('Limit orders require a price');
            ccxtOrder = await client.createLimitOrder(
                request.symbol,
                request.side,
                amount,
                price,
                params
            );
        } else {
            // For stop orders, use createOrder with type
            ccxtOrder = await client.createOrder(
                request.symbol,
                request.type,
                request.side,
                amount,
                price,
                params
            );
        }

        const order = mapCCXTOrder(ccxtOrder, request, clientOrderId);

        log.info({
            orderId: order.id,
            exchangeOrderId: order.exchangeOrderId,
            status: order.status,
        }, 'Order placed successfully');

        return order;

    } catch (error) {
        log.error({ error, request }, 'Failed to place order');

        // Return failed order for tracking
        return {
            id: clientOrderId,
            strategyId: request.strategyId,
            userId: request.userId,
            exchange: request.exchange,
            symbol: request.symbol,
            side: request.side,
            type: request.type,
            status: 'failed',
            amount: request.amount,
            filled: 0,
            remaining: request.amount,
            cost: 0,
            clientOrderId,
            dryRun: request.dryRun ?? false,
            metadata: { error: (error as Error).message },
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
}

/**
 * Cancel an order
 */
export async function cancelOrder(
    client: Exchange,
    symbol: string,
    orderId: string
): Promise<boolean> {
    try {
        await client.cancelOrder(orderId, symbol);
        log.info({ orderId, symbol }, 'Order cancelled');
        return true;
    } catch (error) {
        log.error({ error, orderId, symbol }, 'Failed to cancel order');
        return false;
    }
}

/**
 * Get order status
 */
export async function getOrderStatus(
    client: Exchange,
    symbol: string,
    orderId: string
): Promise<Order | null> {
    try {
        const ccxtOrder = await client.fetchOrder(orderId, symbol);
        return mapCCXTOrderBasic(ccxtOrder);
    } catch (error) {
        log.error({ error, orderId }, 'Failed to fetch order status');
        return null;
    }
}

/**
 * Get open orders
 */
export async function getOpenOrders(
    client: Exchange,
    symbol?: string
): Promise<Order[]> {
    try {
        const orders = await client.fetchOpenOrders(symbol);
        return orders.map(mapCCXTOrderBasic);
    } catch (error) {
        log.error({ error, symbol }, 'Failed to fetch open orders');
        return [];
    }
}

// ============================================
// PAPER TRADING (DRY RUN)
// ============================================

/**
 * Simulate an order (paper trading)
 */
export async function simulateOrder(
    client: Exchange,
    request: OrderRequest
): Promise<Order> {
    const clientOrderId = `DRY_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    log.info({
        symbol: request.symbol,
        side: request.side,
        amount: request.amount,
        dryRun: true,
    }, 'Simulating order (paper trade)');

    try {
        // Get current price for simulation
        const ticker = await getTicker(client, request.symbol);

        // Use bid/ask based on side (realistic slippage simulation)
        const simulatedPrice = request.type === 'market'
            ? (request.side === 'buy' ? ticker.ask : ticker.bid)
            : (request.price ?? ticker.last);

        const cost = new Decimal(request.amount).mul(simulatedPrice).toNumber();

        return {
            id: clientOrderId,
            strategyId: request.strategyId,
            userId: request.userId,
            exchange: request.exchange,
            symbol: request.symbol,
            side: request.side,
            type: request.type,
            status: 'filled', // Paper trades fill instantly
            price: request.price,
            amount: request.amount,
            filled: request.amount,
            remaining: 0,
            cost,
            avgPrice: simulatedPrice,
            exchangeOrderId: `SIM_${Date.now()}`,
            clientOrderId,
            dryRun: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            filledAt: new Date(),
        };
    } catch (error) {
        log.error({ error, request }, 'Failed to simulate order');
        throw error;
    }
}

// ============================================
// HELPERS
// ============================================

/**
 * Map CCXT order to our Order type
 */
function mapCCXTOrder(
    ccxtOrder: CCXTOrder,
    request: OrderRequest,
    clientOrderId: string
): Order {
    return {
        id: clientOrderId,
        strategyId: request.strategyId,
        userId: request.userId,
        exchange: request.exchange,
        symbol: ccxtOrder.symbol,
        side: ccxtOrder.side as 'buy' | 'sell',
        type: mapOrderType(ccxtOrder.type),
        status: mapOrderStatus(ccxtOrder.status),
        price: ccxtOrder.price ?? undefined,
        stopPrice: ccxtOrder.stopPrice ?? undefined,
        amount: ccxtOrder.amount,
        filled: ccxtOrder.filled,
        remaining: ccxtOrder.remaining,
        cost: ccxtOrder.cost ?? 0,
        avgPrice: ccxtOrder.average ?? undefined,
        fee: ccxtOrder.fee ? mapFee(ccxtOrder.fee) : undefined,
        exchangeOrderId: ccxtOrder.id,
        clientOrderId,
        dryRun: request.dryRun ?? false,
        createdAt: new Date(ccxtOrder.timestamp ?? Date.now()),
        updatedAt: new Date(),
        filledAt: ccxtOrder.status === 'closed' ? new Date() : undefined,
    };
}

/**
 * Map CCXT order without full request context
 */
function mapCCXTOrderBasic(ccxtOrder: CCXTOrder): Order {
    return {
        id: ccxtOrder.clientOrderId ?? ccxtOrder.id,
        strategyId: '',
        userId: '',
        exchange: '',
        symbol: ccxtOrder.symbol,
        side: ccxtOrder.side as 'buy' | 'sell',
        type: mapOrderType(ccxtOrder.type),
        status: mapOrderStatus(ccxtOrder.status),
        price: ccxtOrder.price ?? undefined,
        stopPrice: ccxtOrder.stopPrice ?? undefined,
        amount: ccxtOrder.amount,
        filled: ccxtOrder.filled,
        remaining: ccxtOrder.remaining,
        cost: ccxtOrder.cost ?? 0,
        avgPrice: ccxtOrder.average ?? undefined,
        fee: ccxtOrder.fee ? mapFee(ccxtOrder.fee) : undefined,
        exchangeOrderId: ccxtOrder.id,
        clientOrderId: ccxtOrder.clientOrderId ?? '',
        dryRun: false,
        createdAt: new Date(ccxtOrder.timestamp ?? Date.now()),
        updatedAt: new Date(),
    };
}

function mapOrderType(type: string | undefined): Order['type'] {
    const typeMap: Record<string, Order['type']> = {
        market: 'market',
        limit: 'limit',
        stop: 'stop_loss',
        stop_loss: 'stop_loss',
        take_profit: 'take_profit',
        stop_limit: 'stop_limit',
    };
    return typeMap[type ?? 'market'] ?? 'market';
}

function mapOrderStatus(status: string | undefined): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
        open: 'open',
        closed: 'filled',
        canceled: 'cancelled',
        cancelled: 'cancelled',
        expired: 'expired',
        rejected: 'failed',
    };
    return statusMap[status ?? 'pending'] ?? 'pending';
}

function mapFee(fee: { cost?: number; currency?: string; rate?: number }): OrderFee {
    return {
        cost: fee.cost ?? 0,
        currency: fee.currency ?? 'USDT',
        rate: fee.rate,
    };
}

function formatAmount(amount: number, precision: number): number {
    return new Decimal(amount).toDecimalPlaces(precision, Decimal.ROUND_DOWN).toNumber();
}

function formatPrice(price: number, precision: number): number {
    return new Decimal(price).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Clean up exchange clients
 */
export function closeAllClients(): void {
    for (const [key, client] of exchangeClients) {
        try {
            // CCXT doesn't have explicit close, but we clear the cache
            log.debug({ key }, 'Closing exchange client');
        } catch (error) {
            log.error({ error, key }, 'Error closing client');
        }
    }
    exchangeClients.clear();
}
