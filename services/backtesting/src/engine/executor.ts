/**
 * Strategy Executor
 * Main backtesting engine that runs strategies against historical data
 */

import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import type {
    BacktestConfig,
    BacktestResult,
    SimulatedTrade,
    EquityPoint,
    OHLCV,
    SignalPrediction,
} from '@neuraltrade/shared-types';
import { OrderSimulator, Order, Position } from './order-simulator.js';
import { PerformanceCalculator } from '../metrics/performance.js';
import pino from 'pino';

const log = pino({ name: 'strategy-executor' });

export class StrategyExecutor {
    private orderSimulator: OrderSimulator;
    private performanceCalculator: PerformanceCalculator;

    constructor() {
        this.performanceCalculator = new PerformanceCalculator();
        this.orderSimulator = new OrderSimulator({
            slippagePercent: 0.1,
            commissionPercent: 0.1,
        });
    }

    /**
     * Execute backtest with given configuration and signals
     */
    async execute(
        config: BacktestConfig,
        candles: OHLCV[],
        signals: SignalPrediction[]
    ): Promise<BacktestResult> {
        const startedAt = Date.now();
        log.info({ configId: config.id, candleCount: candles.length, signalCount: signals.length }, 'Starting backtest');

        // Update order simulator with config
        this.orderSimulator = new OrderSimulator({
            slippagePercent: config.slippagePercent,
            commissionPercent: config.commissionPercent,
        });

        // State
        let equity = config.initialCapital;
        let position: Position | null = null;
        const trades: SimulatedTrade[] = [];
        const equityCurve: EquityPoint[] = [];
        const usedSignals: SignalPrediction[] = [];

        // Create signal lookup by timestamp
        const signalMap = new Map<number, SignalPrediction>();
        for (const signal of signals) {
            signalMap.set(signal.timestamp, signal);
        }

        // Iterate through candles
        for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];

            // Check for exit conditions if we have a position
            if (position) {
                const exitCheck = this.orderSimulator.checkExitConditions(position, candle);

                if (exitCheck.type !== 'none') {
                    // Close position
                    const exitOrder: Order = {
                        id: uuidv4(),
                        side: position.side === 'long' ? 'sell' : 'buy',
                        type: 'market',
                        price: 0,
                        amount: position.amount,
                        timestamp: candle.timestamp,
                    };

                    const fill = this.orderSimulator.executeMarketOrder(exitOrder, candle);
                    fill.fillPrice = exitCheck.exitPrice; // Use exact SL/TP price

                    const pnl = this.orderSimulator.calculateRealizedPnL(
                        position.entryPrice,
                        fill.fillPrice,
                        position.amount,
                        position.side,
                        fill.commission * 2 // Entry + exit commission
                    );

                    const trade: SimulatedTrade = {
                        id: uuidv4(),
                        exchange: config.exchange,
                        symbol: config.symbol,
                        side: position.side === 'long' ? 'sell' : 'buy',
                        price: fill.fillPrice,
                        amount: fill.fillAmount,
                        cost: fill.fillPrice * fill.fillAmount,
                        fee: fill.commission,
                        feeCurrency: 'USDT',
                        timestamp: candle.timestamp,
                        signalId: '', // Would link to original signal
                        entryTimestamp: position.entryTime,
                        exitTimestamp: candle.timestamp,
                        profitLoss: pnl,
                        profitLossPercent: (pnl / (position.entryPrice * position.amount)) * 100,
                        exitReason: exitCheck.type,
                    };

                    trades.push(trade);
                    equity += pnl;
                    position = null;

                    log.debug({
                        exitType: exitCheck.type,
                        pnl,
                        equity
                    }, 'Position closed');
                }
            }

            // Check for entry signal if no position
            if (!position) {
                // Find signal near this candle timestamp (within timeframe)
                const signal = this.findSignalForCandle(candle, signals, config.timeframe);

                if (signal && signal.direction !== 'neutral' && signal.confidence >= 0.85) {
                    // Calculate position size
                    const positionValue = new Decimal(equity)
                        .mul(config.maxPositionSize / 100)
                        .mul(config.leverage);
                    const positionSize = positionValue.div(candle.open).toNumber();

                    // Create entry order
                    const entryOrder: Order = {
                        id: uuidv4(),
                        side: signal.direction === 'long' ? 'buy' : 'sell',
                        type: 'market',
                        price: 0,
                        amount: positionSize,
                        stopLoss: signal.stopLoss,
                        takeProfit: signal.takeProfit,
                        timestamp: candle.timestamp,
                    };

                    const fill = this.orderSimulator.executeMarketOrder(entryOrder, candle);

                    position = {
                        entryPrice: fill.fillPrice,
                        amount: fill.fillAmount,
                        side: signal.direction as 'long' | 'short',
                        stopLoss: signal.stopLoss,
                        takeProfit: signal.takeProfit,
                        entryTime: candle.timestamp,
                        unrealizedPnL: 0,
                    };

                    usedSignals.push(signal);
                    equity -= fill.commission;

                    log.debug({
                        side: signal.direction,
                        entry: fill.fillPrice,
                        amount: fill.fillAmount
                    }, 'Position opened');
                }
            }

            // Update unrealized PnL
            if (position) {
                position.unrealizedPnL = this.orderSimulator.calculateUnrealizedPnL(
                    position,
                    candle.close
                );
            }

            // Record equity curve point
            const drawdown = equityCurve.length > 0
                ? Math.max(0, Math.max(...equityCurve.map(e => e.equity)) - equity)
                : 0;

            equityCurve.push({
                timestamp: candle.timestamp,
                equity: equity + (position?.unrealizedPnL || 0),
                drawdown,
                openPositions: position ? 1 : 0,
            });
        }

        // Close any remaining position at end
        if (position && candles.length > 0) {
            const lastCandle = candles[candles.length - 1];
            const pnl = this.orderSimulator.calculateRealizedPnL(
                position.entryPrice,
                lastCandle.close,
                position.amount,
                position.side,
                0
            );

            const trade: SimulatedTrade = {
                id: uuidv4(),
                exchange: config.exchange,
                symbol: config.symbol,
                side: position.side === 'long' ? 'sell' : 'buy',
                price: lastCandle.close,
                amount: position.amount,
                cost: lastCandle.close * position.amount,
                fee: 0,
                feeCurrency: 'USDT',
                timestamp: lastCandle.timestamp,
                signalId: '',
                entryTimestamp: position.entryTime,
                exitTimestamp: lastCandle.timestamp,
                profitLoss: pnl,
                profitLossPercent: (pnl / (position.entryPrice * position.amount)) * 100,
                exitReason: 'end_of_backtest',
            };

            trades.push(trade);
            equity += pnl;
        }

        const completedAt = Date.now();
        const durationMs = completedAt - startedAt;

        // Calculate metrics
        const metrics = this.performanceCalculator.calculate(
            trades,
            equityCurve,
            config.initialCapital
        );

        log.info({
            configId: config.id,
            trades: trades.length,
            netProfit: metrics.netProfit.toFixed(2),
            winRate: metrics.winRate.toFixed(1),
            sharpe: metrics.sharpeRatio.toFixed(2),
            durationMs,
        }, 'Backtest completed');

        return {
            id: uuidv4(),
            configId: config.id,
            status: 'completed',
            metrics,
            trades,
            signals: usedSignals,
            equityCurve,
            startedAt,
            completedAt,
            durationMs,
        };
    }

    /**
     * Find signal that applies to a given candle
     */
    private findSignalForCandle(
        candle: OHLCV,
        signals: SignalPrediction[],
        timeframe: string
    ): SignalPrediction | undefined {
        // Get timeframe in milliseconds
        const tfMs = this.getTimeframeMs(timeframe);

        // Find signal within timeframe window before candle
        return signals.find(s =>
            s.timestamp <= candle.timestamp &&
            s.timestamp > candle.timestamp - tfMs
        );
    }

    /**
     * Convert timeframe to milliseconds
     */
    private getTimeframeMs(timeframe: string): number {
        const map: Record<string, number> = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
        };
        return map[timeframe] || 60 * 60 * 1000;
    }
}
