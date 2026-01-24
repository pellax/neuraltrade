/**
 * Backtesting Types
 */

import type { Exchange, Symbol, Timeframe, Trade } from './market.types.js';
import type { SignalPrediction } from './signal.types.js';

/** Backtest status */
export type BacktestStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Backtest configuration */
export interface BacktestConfig {
    id: string;
    userId: string;
    strategyId: string;

    // Market settings
    exchange: Exchange;
    symbol: Symbol;
    timeframe: Timeframe;

    // Time range
    startDate: number;           // Unix timestamp
    endDate: number;             // Unix timestamp

    // Capital settings
    initialCapital: number;
    leverage: number;

    // Risk management
    maxPositionSize: number;     // Percentage
    stopLossPercent: number;
    takeProfitPercent: number;

    // Execution simulation
    slippagePercent: number;
    commissionPercent: number;
}

/** Backtest result */
export interface BacktestResult {
    id: string;
    configId: string;
    status: BacktestStatus;

    // Performance Metrics
    metrics: BacktestMetrics;

    // Trade history
    trades: SimulatedTrade[];
    signals: SignalPrediction[];

    // Equity curve (for charting)
    equityCurve: EquityPoint[];

    // Execution info
    startedAt: number;
    completedAt: number;
    durationMs: number;

    // Report
    reportUrl?: string;
}

/** Comprehensive backtest metrics */
export interface BacktestMetrics {
    // Returns
    totalReturn: number;
    totalReturnPercent: number;
    annualizedReturn: number;

    // Risk-adjusted returns
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;

    // Drawdown
    maxDrawdown: number;
    maxDrawdownPercent: number;
    avgDrawdown: number;
    maxDrawdownDuration: number;  // Days

    // Win/Loss Analysis
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;

    // Profit Analysis
    grossProfit: number;
    grossLoss: number;
    netProfit: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;

    // Risk Metrics
    expectancy: number;
    riskRewardRatio: number;
    volatility: number;
    valueAtRisk95: number;       // 95% VaR

    // Time Metrics
    avgHoldingPeriod: number;    // Hours
    longestWinStreak: number;
    longestLossStreak: number;
}

/** Simulated trade for backtest */
export interface SimulatedTrade extends Trade {
    signalId: string;
    entryTimestamp: number;
    exitTimestamp: number;
    profitLoss: number;
    profitLossPercent: number;
    exitReason: 'take_profit' | 'stop_loss' | 'signal_exit' | 'end_of_backtest';
}

/** Equity curve data point */
export interface EquityPoint {
    timestamp: number;
    equity: number;
    drawdown: number;
    openPositions: number;
}

/** Trading strategy definition */
export interface TradingStrategy {
    id: string;
    userId: string;
    name: string;
    description: string;

    // Entry/Exit rules (serialized logic)
    entryRules: StrategyRule[];
    exitRules: StrategyRule[];

    // Position sizing
    positionSizing: 'fixed' | 'percent' | 'kelly';
    positionSizeValue: number;

    // Metadata
    isPublic: boolean;
    backtestCount: number;
    avgPerformance: number;
    createdAt: number;
    updatedAt: number;
}

/** Strategy rule definition */
export interface StrategyRule {
    id: string;
    type: 'indicator' | 'price_action' | 'ml_signal' | 'time';
    indicator?: string;
    operator: 'crosses_above' | 'crosses_below' | 'greater_than' | 'less_than' | 'equals';
    value: number | string;
    parameters?: Record<string, number>;
}
