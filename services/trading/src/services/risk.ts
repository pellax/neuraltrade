/**
 * Risk Management Service
 * Pre-trade risk checks and portfolio risk monitoring
 */

import Decimal from 'decimal.js';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import { getOpenPositions, getPositionStats } from './position.js';
import type {
    RiskCheck,
    RiskLimits,
    OrderRequest,
    ExchangeBalance,
} from '../types/index.js';

const log = createLogger('RiskService');

// ============================================
// DEFAULT RISK LIMITS
// ============================================

export function getDefaultRiskLimits(): RiskLimits {
    return {
        maxPositionSizePercent: env.MAX_POSITION_SIZE_PERCENT,
        maxPositionSizeUSD: env.MAX_POSITION_SIZE_USD,
        maxDailyLossPercent: env.MAX_DAILY_LOSS_PERCENT,
        maxOpenPositions: env.MAX_OPEN_POSITIONS,
        maxLeverage: env.MAX_LEVERAGE,
        requireStopLoss: env.REQUIRE_STOP_LOSS,
    };
}

// Daily loss tracking (in-memory, would be Redis in production)
const dailyLossTracker: Map<string, { date: string; loss: number }> = new Map();

// ============================================
// PRE-TRADE RISK CHECKS
// ============================================

/**
 * Perform comprehensive pre-trade risk checks
 */
export async function checkTradeRisk(
    request: OrderRequest,
    balances: ExchangeBalance[],
    currentPrice: number,
    limits?: Partial<RiskLimits>
): Promise<RiskCheck> {
    const riskLimits = { ...getDefaultRiskLimits(), ...limits };

    const checks: RiskCheck['checks'] = {
        maxPositionSize: { passed: true },
        maxDailyLoss: { passed: true },
        maxOpenPositions: { passed: true },
        marginAvailable: { passed: true },
        symbolAllowed: { passed: true },
    };

    // Calculate order value
    const orderValue = new Decimal(request.amount).mul(currentPrice).toNumber();

    // 1. Check position size
    const positionSizeCheck = checkPositionSize(orderValue, balances, riskLimits);
    checks.maxPositionSize = positionSizeCheck;

    // 2. Check daily loss
    const dailyLossCheck = await checkDailyLoss(request.userId, riskLimits);
    checks.maxDailyLoss = dailyLossCheck;

    // 3. Check max open positions
    const openPositionsCheck = await checkOpenPositions(request.userId, riskLimits);
    checks.maxOpenPositions = openPositionsCheck;

    // 4. Check margin/balance available
    const marginCheck = checkMarginAvailable(request, balances, currentPrice);
    checks.marginAvailable = marginCheck;

    // 5. Check symbol allowed
    const symbolCheck = checkSymbolAllowed(request.symbol, riskLimits);
    checks.symbolAllowed = symbolCheck;

    // Determine overall result
    const allPassed = Object.values(checks).every(c => c.passed);
    const failedChecks = Object.entries(checks)
        .filter(([, c]) => !c.passed)
        .map(([name, c]) => `${name}: ${c.message}`)
        .join('; ');

    const result: RiskCheck = {
        passed: allPassed,
        checks,
        overallMessage: allPassed
            ? 'All risk checks passed'
            : `Risk checks failed: ${failedChecks}`,
    };

    log.info({
        userId: request.userId,
        symbol: request.symbol,
        orderValue,
        passed: result.passed,
    }, result.passed ? 'Risk checks passed' : 'Risk checks failed');

    return result;
}

/**
 * Check position size limits
 */
function checkPositionSize(
    orderValue: number,
    balances: ExchangeBalance[],
    limits: RiskLimits
): { passed: boolean; message?: string } {
    // Check absolute limit
    if (orderValue > limits.maxPositionSizeUSD) {
        return {
            passed: false,
            message: `Order value $${orderValue.toFixed(2)} exceeds max $${limits.maxPositionSizeUSD}`,
        };
    }

    // Check percentage limit
    const totalPortfolio = calculatePortfolioValue(balances);
    const percentOfPortfolio = new Decimal(orderValue).div(totalPortfolio).mul(100).toNumber();

    if (percentOfPortfolio > limits.maxPositionSizePercent) {
        return {
            passed: false,
            message: `Order is ${percentOfPortfolio.toFixed(1)}% of portfolio, max is ${limits.maxPositionSizePercent}%`,
        };
    }

    return { passed: true };
}

/**
 * Check daily loss limit
 */
async function checkDailyLoss(
    userId: string,
    limits: RiskLimits
): Promise<{ passed: boolean; message?: string }> {
    const today = new Date().toISOString().split('T')[0];
    const tracker = dailyLossTracker.get(userId);

    // Reset if new day
    if (!tracker || tracker.date !== today) {
        dailyLossTracker.set(userId, { date: today, loss: 0 });
        return { passed: true };
    }

    // Get current stats
    const stats = await getPositionStats(userId);
    const totalLossToday = Math.abs(Math.min(0, stats.totalRealizedPnl + stats.totalUnrealizedPnl));

    // Rough portfolio estimate (would need actual portfolio value)
    const maxDailyLossAmount = limits.maxDailyLossPercent * 100; // Simplified

    if (totalLossToday > maxDailyLossAmount) {
        return {
            passed: false,
            message: `Daily loss $${totalLossToday.toFixed(2)} exceeds ${limits.maxDailyLossPercent}% limit`,
        };
    }

    return { passed: true };
}

/**
 * Check max open positions
 */
async function checkOpenPositions(
    userId: string,
    limits: RiskLimits
): Promise<{ passed: boolean; message?: string }> {
    const openPositions = await getOpenPositions(userId);

    if (openPositions.length >= limits.maxOpenPositions) {
        return {
            passed: false,
            message: `Already have ${openPositions.length} positions, max is ${limits.maxOpenPositions}`,
        };
    }

    return { passed: true };
}

/**
 * Check margin/balance availability
 */
function checkMarginAvailable(
    request: OrderRequest,
    balances: ExchangeBalance[],
    currentPrice: number
): { passed: boolean; message?: string } {
    const [, quote] = request.symbol.split('/');
    const quoteBalance = balances.find(b => b.currency === quote);

    if (!quoteBalance) {
        return {
            passed: false,
            message: `No ${quote} balance found`,
        };
    }

    const requiredAmount = request.side === 'buy'
        ? new Decimal(request.amount).mul(currentPrice).toNumber()
        : request.amount; // For sell, need the base currency

    if (request.side === 'buy' && quoteBalance.free < requiredAmount) {
        return {
            passed: false,
            message: `Insufficient ${quote}: need ${requiredAmount.toFixed(2)}, have ${quoteBalance.free.toFixed(2)}`,
        };
    }

    // For sell orders, check base currency
    if (request.side === 'sell') {
        const [base] = request.symbol.split('/');
        const baseBalance = balances.find(b => b.currency === base);

        if (!baseBalance || baseBalance.free < request.amount) {
            return {
                passed: false,
                message: `Insufficient ${base}: need ${request.amount}, have ${baseBalance?.free ?? 0}`,
            };
        }
    }

    return { passed: true };
}

/**
 * Check if symbol is allowed
 */
function checkSymbolAllowed(
    symbol: string,
    limits: RiskLimits
): { passed: boolean; message?: string } {
    // Check blocklist
    if (limits.blockedSymbols?.includes(symbol)) {
        return {
            passed: false,
            message: `Symbol ${symbol} is blocked`,
        };
    }

    // Check whitelist (if defined)
    if (limits.allowedSymbols?.length && !limits.allowedSymbols.includes(symbol)) {
        return {
            passed: false,
            message: `Symbol ${symbol} is not in allowed list`,
        };
    }

    return { passed: true };
}

/**
 * Calculate total portfolio value in USD
 */
function calculatePortfolioValue(balances: ExchangeBalance[]): number {
    // Simplified: assume USDT/USD/BUSD are at $1
    const stablecoins = ['USDT', 'USD', 'BUSD', 'USDC', 'DAI'];

    let total = 0;
    for (const balance of balances) {
        if (stablecoins.includes(balance.currency)) {
            total += balance.total;
        }
        // In production, would convert other currencies using current prices
    }

    return total || 10000; // Default fallback
}

// ============================================
// POSITION-LEVEL RISK
// ============================================

/**
 * Calculate recommended position size based on risk
 */
export function calculatePositionSize(
    portfolioValue: number,
    riskPerTradePercent: number,
    entryPrice: number,
    stopLossPrice: number
): { size: number; riskAmount: number } {
    const riskAmount = new Decimal(portfolioValue).mul(riskPerTradePercent / 100).toNumber();
    const priceRisk = Math.abs(entryPrice - stopLossPrice);

    const size = new Decimal(riskAmount).div(priceRisk).toNumber();

    return {
        size,
        riskAmount,
    };
}

/**
 * Calculate stop loss price based on risk percentage
 */
export function calculateStopLoss(
    entryPrice: number,
    riskPercent: number,
    side: 'long' | 'short'
): number {
    const riskDecimal = new Decimal(riskPercent).div(100);

    if (side === 'long') {
        return new Decimal(entryPrice).mul(new Decimal(1).minus(riskDecimal)).toNumber();
    } else {
        return new Decimal(entryPrice).mul(new Decimal(1).plus(riskDecimal)).toNumber();
    }
}

/**
 * Calculate take profit based on risk/reward ratio
 */
export function calculateTakeProfit(
    entryPrice: number,
    stopLossPrice: number,
    riskRewardRatio: number,
    side: 'long' | 'short'
): number {
    const risk = Math.abs(entryPrice - stopLossPrice);
    const reward = new Decimal(risk).mul(riskRewardRatio).toNumber();

    if (side === 'long') {
        return new Decimal(entryPrice).plus(reward).toNumber();
    } else {
        return new Decimal(entryPrice).minus(reward).toNumber();
    }
}

/**
 * Track realized loss for daily limit
 */
export function recordDailyLoss(userId: string, loss: number): void {
    const today = new Date().toISOString().split('T')[0];
    const tracker = dailyLossTracker.get(userId);

    if (!tracker || tracker.date !== today) {
        dailyLossTracker.set(userId, { date: today, loss: Math.abs(loss) });
    } else {
        tracker.loss += Math.abs(loss);
    }
}

/**
 * Get current daily loss for user
 */
export function getDailyLoss(userId: string): number {
    const today = new Date().toISOString().split('T')[0];
    const tracker = dailyLossTracker.get(userId);

    if (!tracker || tracker.date !== today) {
        return 0;
    }

    return tracker.loss;
}
