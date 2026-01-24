/**
 * Order Simulator
 * Simulates order execution with slippage and commissions
 */

import Decimal from 'decimal.js';
import type { OHLCV } from '@neuraltrade/shared-types';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop';

export interface Order {
    id: string;
    side: OrderSide;
    type: OrderType;
    price: number;         // Limit/stop price (0 for market)
    amount: number;        // Quantity
    stopLoss?: number;
    takeProfit?: number[];
    timestamp: number;
}

export interface Fill {
    orderId: string;
    fillPrice: number;
    fillAmount: number;
    commission: number;
    slippage: number;
    timestamp: number;
}

export interface Position {
    entryPrice: number;
    amount: number;
    side: 'long' | 'short';
    stopLoss: number;
    takeProfit: number[];
    entryTime: number;
    unrealizedPnL: number;
}

export class OrderSimulator {
    private slippagePercent: number;
    private commissionPercent: number;

    constructor(config: { slippagePercent: number; commissionPercent: number }) {
        this.slippagePercent = config.slippagePercent;
        this.commissionPercent = config.commissionPercent;
    }

    /**
     * Simulate market order execution
     */
    executeMarketOrder(order: Order, candle: OHLCV): Fill {
        // Simulate slippage based on order side
        const slippageMultiplier = order.side === 'buy'
            ? 1 + this.slippagePercent / 100
            : 1 - this.slippagePercent / 100;

        // Use open price of candle with slippage
        const fillPrice = new Decimal(candle.open).mul(slippageMultiplier).toNumber();

        // Calculate commission
        const notional = new Decimal(fillPrice).mul(order.amount);
        const commission = notional.mul(this.commissionPercent / 100).toNumber();

        const slippage = Math.abs(fillPrice - candle.open);

        return {
            orderId: order.id,
            fillPrice,
            fillAmount: order.amount,
            commission,
            slippage,
            timestamp: candle.timestamp,
        };
    }

    /**
     * Check if stop-loss or take-profit was hit
     */
    checkExitConditions(
        position: Position,
        candle: OHLCV
    ): { type: 'stop_loss' | 'take_profit' | 'none'; exitPrice: number } {
        const { high, low } = candle;

        if (position.side === 'long') {
            // Check stop-loss (price hits low)
            if (low <= position.stopLoss) {
                return { type: 'stop_loss', exitPrice: position.stopLoss };
            }

            // Check take-profit levels (price hits high)
            for (const tp of position.takeProfit) {
                if (high >= tp) {
                    return { type: 'take_profit', exitPrice: tp };
                }
            }
        } else {
            // Short position
            // Check stop-loss (price hits high)
            if (high >= position.stopLoss) {
                return { type: 'stop_loss', exitPrice: position.stopLoss };
            }

            // Check take-profit levels (price hits low)
            for (const tp of position.takeProfit) {
                if (low <= tp) {
                    return { type: 'take_profit', exitPrice: tp };
                }
            }
        }

        return { type: 'none', exitPrice: 0 };
    }

    /**
     * Calculate unrealized PnL for a position
     */
    calculateUnrealizedPnL(position: Position, currentPrice: number): number {
        const priceDiff = new Decimal(currentPrice).minus(position.entryPrice);

        if (position.side === 'long') {
            return priceDiff.mul(position.amount).toNumber();
        } else {
            return priceDiff.neg().mul(position.amount).toNumber();
        }
    }

    /**
     * Calculate realized PnL for a closed position
     */
    calculateRealizedPnL(
        entryPrice: number,
        exitPrice: number,
        amount: number,
        side: 'long' | 'short',
        totalCommissions: number
    ): number {
        const priceDiff = new Decimal(exitPrice).minus(entryPrice);

        let grossPnL: number;
        if (side === 'long') {
            grossPnL = priceDiff.mul(amount).toNumber();
        } else {
            grossPnL = priceDiff.neg().mul(amount).toNumber();
        }

        return grossPnL - totalCommissions;
    }
}
