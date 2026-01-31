/**
 * Trading Service Exports
 * Public API for the trading service
 */

// Types
export * from './types/index.js';

// Services
export { executeSignal, cancelOrderWithRetry } from './services/executor.js';
export {
    getExchangeClient,
    getBalances,
    getTicker,
    getMarket,
    placeOrder,
    simulateOrder,
    cancelOrder,
    getOrderStatus,
    getOpenOrders,
} from './services/exchange.js';
export {
    openPosition,
    closePosition,
    getPositionById,
    getOpenPositions,
    getPositionBySymbol,
    getPositionStats,
    updatePositionPrice,
    updatePositionRiskLevels,
} from './services/position.js';
export {
    checkTradeRisk,
    getDefaultRiskLimits,
    calculatePositionSize,
    calculateStopLoss,
    calculateTakeProfit,
    getDailyLoss,
} from './services/risk.js';

// Worker
export { startSignalWorker, stopSignalWorker, registerCredentials } from './workers/signal-consumer.js';
