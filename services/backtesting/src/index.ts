/**
 * NeuralTrade Backtesting Service
 * Entry point for backtesting module
 */

export { StrategyExecutor } from './engine/executor.js';
export { OrderSimulator } from './engine/order-simulator.js';
export { PerformanceCalculator } from './metrics/performance.js';
export { HistoricalDataLoader } from './data/historical-loader.js';
