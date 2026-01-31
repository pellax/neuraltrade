/**
 * NeuralTrade Trading Service
 * Main entry point
 */

import { createLogger } from './utils/logger.js';
import { env } from './utils/env.js';
import { initPositionService, closePositionService } from './services/position.js';
import { closeAllClients } from './services/exchange.js';
import { startSignalWorker, stopSignalWorker } from './workers/signal-consumer.js';

const log = createLogger('TradingService');

// ============================================
// LIFECYCLE
// ============================================

async function start(): Promise<void> {
    log.info('Starting NeuralTrade Trading Service...');
    log.info({
        env: env.NODE_ENV,
        minConfidence: env.MIN_CONFIDENCE_THRESHOLD,
        maxPositions: env.MAX_OPEN_POSITIONS,
        maxLeverage: env.MAX_LEVERAGE,
        requireStopLoss: env.REQUIRE_STOP_LOSS,
    }, 'Configuration loaded');

    try {
        // Initialize services
        await initPositionService();
        log.info('Position service initialized');

        // Start signal consumer
        await startSignalWorker();
        log.info('Signal worker started');

        log.info('🚀 Trading Service is running');

    } catch (error) {
        log.error({ error }, 'Failed to start Trading Service');
        process.exit(1);
    }
}

async function shutdown(signal: string): Promise<void> {
    log.info({ signal }, 'Shutdown signal received');

    try {
        // Stop consuming signals
        await stopSignalWorker();

        // Close exchange connections
        closeAllClients();

        // Close database
        await closePositionService();

        log.info('Graceful shutdown complete');
        process.exit(0);

    } catch (error) {
        log.error({ error }, 'Error during shutdown');
        process.exit(1);
    }
}

// ============================================
// SIGNAL HANDLERS
// ============================================

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
    log.error({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
    log.error({ reason }, 'Unhandled rejection');
});

// ============================================
// START
// ============================================

start();
