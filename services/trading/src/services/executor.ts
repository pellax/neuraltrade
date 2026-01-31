/**
 * Trade Executor
 * Orchestrates the complete trade execution flow
 */

import { v4 as uuid } from 'uuid';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import {
    getExchangeClient,
    placeOrder,
    simulateOrder,
    getBalances,
    getTicker,
    cancelOrder,
} from './exchange.js';
import {
    openPosition,
    updatePositionFromOrder,
    getPositionBySymbol,
    closePosition,
} from './position.js';
import { checkTradeRisk, recordDailyLoss } from './risk.js';
import type {
    TradeSignal,
    TradeExecution,
    OrderRequest,
    Order,
    ExchangeCredentials,
    RiskLimits,
    SupportedExchange,
} from '../types/index.js';

const log = createLogger('TradeExecutor');

// ============================================
// MAIN EXECUTION FLOW
// ============================================

/**
 * Execute a trade signal
 */
export async function executeSignal(
    signal: TradeSignal,
    credentials: ExchangeCredentials,
    riskLimits?: Partial<RiskLimits>
): Promise<TradeExecution> {
    const executionId = uuid();
    log.info({
        executionId,
        signalId: signal.id,
        symbol: signal.symbol,
        direction: signal.direction,
        confidence: signal.confidence,
    }, 'Starting signal execution');

    try {
        // 1. Check signal validity
        if (signal.expiresAt && new Date(signal.expiresAt) < new Date()) {
            return createFailedExecution(signal, executionId, 'Signal expired');
        }

        // 2. Check confidence threshold
        if (signal.confidence < env.MIN_CONFIDENCE_THRESHOLD) {
            return createFailedExecution(
                signal,
                executionId,
                `Confidence ${signal.confidence} below threshold ${env.MIN_CONFIDENCE_THRESHOLD}`
            );
        }

        // 3. Get exchange client
        const client = getExchangeClient(signal.exchange as SupportedExchange, credentials);

        // 4. Get current market data
        const ticker = await getTicker(client, signal.symbol);
        const balances = await getBalances(client);

        // 5. Handle close signal
        if (signal.direction === 'close') {
            return await executeClosePosition(signal, client, credentials, ticker.last);
        }

        // 6. Calculate order size
        const orderSize = calculateOrderSize(signal, balances, ticker.last);

        if (orderSize <= 0) {
            return createFailedExecution(signal, executionId, 'Invalid order size');
        }

        // 7. Run risk checks
        const orderRequest: OrderRequest = {
            strategyId: signal.strategyId,
            userId: signal.userId,
            exchange: signal.exchange,
            symbol: signal.symbol,
            side: signal.direction === 'long' ? 'buy' : 'sell',
            type: signal.entryPrice ? 'limit' : 'market',
            amount: orderSize,
            price: signal.entryPrice,
            dryRun: false,
        };

        const riskCheck = await checkTradeRisk(orderRequest, balances, ticker.last, riskLimits);

        if (!riskCheck.passed) {
            // Fall back to dry run if enabled
            if (env.ENABLE_DRY_RUN_FALLBACK) {
                log.warn({
                    signalId: signal.id,
                    reason: riskCheck.overallMessage,
                }, 'Falling back to paper trade due to risk check failure');
                orderRequest.dryRun = true;
            } else {
                return createFailedExecution(signal, executionId, riskCheck.overallMessage);
            }
        }

        // 8. Execute order
        const order = orderRequest.dryRun
            ? await simulateOrder(client, orderRequest)
            : await placeOrder(client, orderRequest);

        if (order.status === 'failed') {
            return createFailedExecution(signal, executionId, order.metadata?.error as string);
        }

        // 9. Track position
        const position = await trackPosition(signal, order);

        // 10. Place stop loss / take profit if specified
        if (signal.stopLoss && !orderRequest.dryRun) {
            await placeStopLoss(client, signal, order);
        }
        if (signal.takeProfit && !orderRequest.dryRun) {
            await placeTakeProfit(client, signal, order);
        }

        // 11. Calculate slippage
        let slippage: number | undefined;
        if (order.avgPrice && signal.entryPrice) {
            slippage = Math.abs(
                ((order.avgPrice - signal.entryPrice) / signal.entryPrice) * 100
            );
        }

        log.info({
            executionId,
            orderId: order.id,
            positionId: position?.id,
            status: order.status,
            avgPrice: order.avgPrice,
            slippage,
        }, 'Signal executed successfully');

        return {
            signalId: signal.id,
            orderId: order.id,
            positionId: position?.id,
            status: order.status === 'filled' ? 'success' : 'partial',
            executedPrice: order.avgPrice,
            executedSize: order.filled,
            slippage,
            executedAt: new Date(),
        };

    } catch (error) {
        log.error({ error, signalId: signal.id }, 'Signal execution failed');
        return createFailedExecution(signal, executionId, (error as Error).message);
    }
}

/**
 * Execute a close position signal
 */
async function executeClosePosition(
    signal: TradeSignal,
    client: ReturnType<typeof getExchangeClient>,
    credentials: ExchangeCredentials,
    currentPrice: number
): Promise<TradeExecution> {
    const position = await getPositionBySymbol(
        signal.userId,
        signal.strategyId,
        signal.symbol
    );

    if (!position) {
        return createFailedExecution(signal, uuid(), 'No open position to close');
    }

    // Create close order (opposite side)
    const closeRequest: OrderRequest = {
        strategyId: signal.strategyId,
        userId: signal.userId,
        exchange: signal.exchange,
        symbol: signal.symbol,
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market',
        amount: position.size,
        reduceOnly: true,
    };

    const order = await placeOrder(client, closeRequest);

    if (order.status === 'failed') {
        return createFailedExecution(signal, uuid(), order.metadata?.error as string);
    }

    // Update position as closed
    await closePosition(position.id, order.avgPrice ?? currentPrice);

    // Record daily loss if applicable
    if (position.realizedPnl < 0) {
        recordDailyLoss(signal.userId, position.realizedPnl);
    }

    return {
        signalId: signal.id,
        orderId: order.id,
        positionId: position.id,
        status: 'success',
        executedPrice: order.avgPrice,
        executedSize: order.filled,
        executedAt: new Date(),
    };
}

// ============================================
// HELPERS
// ============================================

/**
 * Calculate order size based on signal and account
 */
function calculateOrderSize(
    signal: TradeSignal,
    balances: { currency: string; free: number }[],
    currentPrice: number
): number {
    // Get quote currency balance (assume format BASE/QUOTE)
    const [, quote] = signal.symbol.split('/');
    const quoteBalance = balances.find(b => b.currency === quote);

    if (!quoteBalance) {
        log.warn({ symbol: signal.symbol, quote }, 'Quote currency balance not found');
        return 0;
    }

    // Use suggested size as percentage of available balance
    const sizePercent = Math.min(signal.suggestedSize, 1); // Max 100%
    const quoteAmount = quoteBalance.free * sizePercent;
    const size = quoteAmount / currentPrice;

    return size;
}

/**
 * Track/update position after order
 */
async function trackPosition(signal: TradeSignal, order: Order) {
    if (order.status !== 'filled' && order.status !== 'partially_filled') {
        return null;
    }

    // Check for existing position
    const existingPosition = await getPositionBySymbol(
        signal.userId,
        signal.strategyId,
        signal.symbol
    );

    if (existingPosition) {
        return updatePositionFromOrder(existingPosition.id, order);
    } else {
        return openPosition(order);
    }
}

/**
 * Place stop loss order
 */
async function placeStopLoss(
    client: ReturnType<typeof getExchangeClient>,
    signal: TradeSignal,
    parentOrder: Order
): Promise<Order | null> {
    try {
        const stopRequest: OrderRequest = {
            strategyId: signal.strategyId,
            userId: signal.userId,
            exchange: signal.exchange,
            symbol: signal.symbol,
            side: signal.direction === 'long' ? 'sell' : 'buy',
            type: 'stop_loss',
            amount: parentOrder.filled,
            stopPrice: signal.stopLoss,
            reduceOnly: true,
        };

        return await placeOrder(client, stopRequest);
    } catch (error) {
        log.error({ error, signalId: signal.id }, 'Failed to place stop loss');
        return null;
    }
}

/**
 * Place take profit order
 */
async function placeTakeProfit(
    client: ReturnType<typeof getExchangeClient>,
    signal: TradeSignal,
    parentOrder: Order
): Promise<Order | null> {
    try {
        const tpRequest: OrderRequest = {
            strategyId: signal.strategyId,
            userId: signal.userId,
            exchange: signal.exchange,
            symbol: signal.symbol,
            side: signal.direction === 'long' ? 'sell' : 'buy',
            type: 'take_profit',
            amount: parentOrder.filled,
            stopPrice: signal.takeProfit,
            reduceOnly: true,
        };

        return await placeOrder(client, tpRequest);
    } catch (error) {
        log.error({ error, signalId: signal.id }, 'Failed to place take profit');
        return null;
    }
}

/**
 * Create a failed execution result
 */
function createFailedExecution(
    signal: TradeSignal,
    executionId: string,
    error?: string
): TradeExecution {
    return {
        signalId: signal.id,
        orderId: `failed_${executionId}`,
        status: 'failed',
        error,
        executedAt: new Date(),
    };
}

// ============================================
// ORDER MANAGEMENT
// ============================================

/**
 * Cancel an existing order with retry
 */
export async function cancelOrderWithRetry(
    exchange: SupportedExchange,
    credentials: ExchangeCredentials,
    symbol: string,
    orderId: string,
    maxRetries: number = env.ORDER_RETRY_ATTEMPTS
): Promise<boolean> {
    const client = getExchangeClient(exchange, credentials);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const success = await cancelOrder(client, symbol, orderId);
            if (success) return true;
        } catch (error) {
            log.warn({
                error,
                orderId,
                attempt,
                maxRetries,
            }, 'Cancel order attempt failed');

            if (attempt < maxRetries) {
                await delay(env.ORDER_RETRY_DELAY_MS * attempt);
            }
        }
    }

    return false;
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
