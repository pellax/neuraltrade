/**
 * NeuralTrade Notification Service
 * Main entry point
 */

import { createLogger } from './utils/logger.js';
import { env } from './utils/env.js';
import { initEmailService, closeEmailService } from './services/email.js';
import { initDispatcher, closeDispatcher } from './services/dispatcher.js';
import { startNotificationWorker, stopNotificationWorker } from './workers/notification-consumer.js';
import { startEmailVerificationWorker, stopEmailVerificationWorker } from './workers/email-verification-consumer.js';

const log = createLogger('NotificationService');

// ============================================
// LIFECYCLE
// ============================================

async function start(): Promise<void> {
    log.info('Starting NeuralTrade Notification Service...');
    log.info({
        env: env.NODE_ENV,
        smtpHost: env.SMTP_HOST,
        hasTelegram: !!env.TELEGRAM_BOT_TOKEN,
        hasDiscord: !!env.DISCORD_WEBHOOK_URL,
        maxPerMinute: env.MAX_NOTIFICATIONS_PER_MINUTE,
        maxPerHour: env.MAX_NOTIFICATIONS_PER_HOUR,
    }, 'Configuration loaded');

    try {
        // Initialize services
        await initDispatcher();
        log.info('Dispatcher initialized');

        await initEmailService();
        log.info('Email service initialized');

        // Start consumer
        await startNotificationWorker();
        log.info('Notification worker started');

        // Start email verification consumer
        await startEmailVerificationWorker();
        log.info('Email verification worker started');

        log.info('🔔 Notification Service is running');

    } catch (error) {
        log.error({ error }, 'Failed to start Notification Service');
        process.exit(1);
    }
}

async function shutdown(signal: string): Promise<void> {
    log.info({ signal }, 'Shutdown signal received');

    try {
        // Stop consuming
        await stopNotificationWorker();
        await stopEmailVerificationWorker();

        // Close services
        await closeEmailService();
        await closeDispatcher();

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
