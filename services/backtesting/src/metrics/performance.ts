/**
 * Performance Metrics Calculator
 * Calculates comprehensive backtest performance metrics
 */

import Decimal from 'decimal.js';
import type { BacktestMetrics, SimulatedTrade, EquityPoint } from '@neuraltrade/shared-types';

export class PerformanceCalculator {
    /**
     * Calculate all backtest performance metrics
     */
    calculate(
        trades: SimulatedTrade[],
        equityCurve: EquityPoint[],
        initialCapital: number
    ): BacktestMetrics {
        const finalEquity = equityCurve.length > 0
            ? equityCurve[equityCurve.length - 1].equity
            : initialCapital;

        // Basic returns
        const totalReturn = finalEquity - initialCapital;
        const totalReturnPercent = (totalReturn / initialCapital) * 100;

        // Win/Loss analysis
        const winningTrades = trades.filter(t => t.profitLoss > 0);
        const losingTrades = trades.filter(t => t.profitLoss < 0);
        const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

        // Profit analysis
        const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0));
        const netProfit = grossProfit - grossLoss;
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

        // Average win/loss
        const averageWin = winningTrades.length > 0
            ? grossProfit / winningTrades.length
            : 0;
        const averageLoss = losingTrades.length > 0
            ? grossLoss / losingTrades.length
            : 0;

        // Largest win/loss
        const largestWin = winningTrades.length > 0
            ? Math.max(...winningTrades.map(t => t.profitLoss))
            : 0;
        const largestLoss = losingTrades.length > 0
            ? Math.abs(Math.min(...losingTrades.map(t => t.profitLoss)))
            : 0;

        // Drawdown analysis
        const { maxDrawdown, maxDrawdownPercent, avgDrawdown, maxDrawdownDuration } =
            this.calculateDrawdownMetrics(equityCurve);

        // Risk-adjusted returns
        const returns = this.calculatePeriodReturns(equityCurve);
        const sharpeRatio = this.calculateSharpeRatio(returns);
        const sortinoRatio = this.calculateSortinoRatio(returns);
        const volatility = this.calculateVolatility(returns);

        // Annualized return (assuming daily returns)
        const tradingDays = equityCurve.length;
        const annualizedReturn = tradingDays > 0
            ? ((1 + totalReturnPercent / 100) ** (252 / tradingDays) - 1) * 100
            : 0;

        // Calmar ratio
        const calmarRatio = maxDrawdownPercent > 0
            ? annualizedReturn / maxDrawdownPercent
            : 0;

        // Expectancy
        const expectancy = trades.length > 0
            ? (winRate / 100 * averageWin) - ((100 - winRate) / 100 * averageLoss)
            : 0;

        // Risk/Reward ratio
        const riskRewardRatio = averageLoss > 0 ? averageWin / averageLoss : 0;

        // Value at Risk (95%)
        const valueAtRisk95 = this.calculateVaR(returns, 0.95);

        // Holding period
        const holdingPeriods = trades.map(t =>
            (t.exitTimestamp - t.entryTimestamp) / (1000 * 60 * 60) // Hours
        );
        const avgHoldingPeriod = holdingPeriods.length > 0
            ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
            : 0;

        // Win/Loss streaks
        const { longestWinStreak, longestLossStreak } = this.calculateStreaks(trades);

        return {
            // Returns
            totalReturn,
            totalReturnPercent,
            annualizedReturn,

            // Risk-adjusted
            sharpeRatio,
            sortinoRatio,
            calmarRatio,

            // Drawdown
            maxDrawdown,
            maxDrawdownPercent,
            avgDrawdown,
            maxDrawdownDuration,

            // Win/Loss
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate,

            // Profit
            grossProfit,
            grossLoss,
            netProfit,
            profitFactor,
            averageWin,
            averageLoss,
            largestWin,
            largestLoss,

            // Risk
            expectancy,
            riskRewardRatio,
            volatility,
            valueAtRisk95,

            // Time
            avgHoldingPeriod,
            longestWinStreak,
            longestLossStreak,
        };
    }

    /**
     * Calculate period returns from equity curve
     */
    private calculatePeriodReturns(equityCurve: EquityPoint[]): number[] {
        const returns: number[] = [];
        for (let i = 1; i < equityCurve.length; i++) {
            const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
            returns.push(ret);
        }
        return returns;
    }

    /**
     * Calculate drawdown metrics
     */
    private calculateDrawdownMetrics(equityCurve: EquityPoint[]): {
        maxDrawdown: number;
        maxDrawdownPercent: number;
        avgDrawdown: number;
        maxDrawdownDuration: number;
    } {
        if (equityCurve.length === 0) {
            return { maxDrawdown: 0, maxDrawdownPercent: 0, avgDrawdown: 0, maxDrawdownDuration: 0 };
        }

        let peak = equityCurve[0].equity;
        let maxDrawdown = 0;
        let maxDrawdownPercent = 0;
        let maxDrawdownDuration = 0;
        let currentDrawdownStart = 0;
        let drawdowns: number[] = [];

        for (let i = 0; i < equityCurve.length; i++) {
            const equity = equityCurve[i].equity;

            if (equity > peak) {
                peak = equity;
                currentDrawdownStart = i;
            }

            const drawdown = peak - equity;
            const drawdownPercent = (drawdown / peak) * 100;

            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
                maxDrawdownPercent = drawdownPercent;
            }

            const duration = i - currentDrawdownStart;
            if (duration > maxDrawdownDuration) {
                maxDrawdownDuration = duration;
            }

            if (drawdownPercent > 0) {
                drawdowns.push(drawdownPercent);
            }
        }

        const avgDrawdown = drawdowns.length > 0
            ? drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length
            : 0;

        return { maxDrawdown, maxDrawdownPercent, avgDrawdown, maxDrawdownDuration };
    }

    /**
     * Calculate Sharpe Ratio (assuming risk-free rate = 0)
     */
    private calculateSharpeRatio(returns: number[]): number {
        if (returns.length < 2) return 0;

        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) return 0;

        // Annualized (assuming daily returns)
        return (avgReturn * 252) / (stdDev * Math.sqrt(252));
    }

    /**
     * Calculate Sortino Ratio (downside deviation only)
     */
    private calculateSortinoRatio(returns: number[]): number {
        if (returns.length < 2) return 0;

        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const negativeReturns = returns.filter(r => r < 0);

        if (negativeReturns.length === 0) return avgReturn > 0 ? Infinity : 0;

        const downsideVariance = negativeReturns.reduce((sum, r) => sum + r ** 2, 0) / negativeReturns.length;
        const downsideDev = Math.sqrt(downsideVariance);

        if (downsideDev === 0) return 0;

        return (avgReturn * 252) / (downsideDev * Math.sqrt(252));
    }

    /**
     * Calculate return volatility
     */
    private calculateVolatility(returns: number[]): number {
        if (returns.length < 2) return 0;

        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length;

        // Annualized volatility
        return Math.sqrt(variance) * Math.sqrt(252) * 100;
    }

    /**
     * Calculate Value at Risk at given confidence level
     */
    private calculateVaR(returns: number[], confidence: number): number {
        if (returns.length === 0) return 0;

        const sorted = [...returns].sort((a, b) => a - b);
        const index = Math.floor((1 - confidence) * sorted.length);

        return Math.abs(sorted[index] || 0) * 100;
    }

    /**
     * Calculate win/loss streaks
     */
    private calculateStreaks(trades: SimulatedTrade[]): {
        longestWinStreak: number;
        longestLossStreak: number;
    } {
        let longestWinStreak = 0;
        let longestLossStreak = 0;
        let currentWinStreak = 0;
        let currentLossStreak = 0;

        for (const trade of trades) {
            if (trade.profitLoss > 0) {
                currentWinStreak++;
                currentLossStreak = 0;
                longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
            } else if (trade.profitLoss < 0) {
                currentLossStreak++;
                currentWinStreak = 0;
                longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
            }
        }

        return { longestWinStreak, longestLossStreak };
    }
}
