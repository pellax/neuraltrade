/**
 * NeuralTrade Ingestion Service
 * Real-time market data ingestion from cryptocurrency exchanges
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { ExchangeAdapter } from './adapters/exchange.adapter.js';
import { MessagePublisher } from './queue/publisher.js';
import { TimeSeriesWriter } from './streams/influx.writer.js';
import { PriceStreamer } from './streams/price.stream.js';
import { subscriptionSchema } from './validators/tick.schema.js';

const log = logger.child({ component: 'Main' });

// Global instances
let publisher: MessagePublisher;
let tsWriter: TimeSeriesWriter;
let exchangeAdapter: ExchangeAdapter;
let priceStreamer: PriceStreamer;

async function main(): Promise<void> {
    log.info('Starting NeuralTrade Ingestion Service...');

    // Initialize components
    publisher = new MessagePublisher();
    await publisher.connect();

    tsWriter = new TimeSeriesWriter();
    exchangeAdapter = new ExchangeAdapter();
    priceStreamer = new PriceStreamer(exchangeAdapter, publisher, tsWriter);

    // Create HTTP server for Socket.IO
    const httpServer = createServer();
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: env.NODE_ENV === 'development' ? '*' : undefined,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        log.info({ socketId: socket.id }, 'Client connected');

        // Subscribe to market feed
        socket.on('subscribe', async (data) => {
            const result = subscriptionSchema.safeParse(data);

            if (!result.success) {
                socket.emit('error', {
                    message: 'Invalid subscription request',
                    errors: result.error.errors
                });
                return;
            }

            const { exchange, symbol, channels, timeframe } = result.data;

            try {
                if (channels.includes('ticker')) {
                    await priceStreamer.subscribeTicker(exchange, symbol);
                }
                if (channels.includes('ohlcv')) {
                    await priceStreamer.subscribeOHLCV(exchange, symbol, timeframe ?? '1m');
                }

                socket.emit('subscribed', { exchange, symbol, channels });
                log.info({ socketId: socket.id, exchange, symbol, channels }, 'Client subscribed');
            } catch (err) {
                socket.emit('error', { message: 'Subscription failed', error: String(err) });
            }
        });

        // Unsubscribe from market feed
        socket.on('unsubscribe', (data) => {
            const { exchange, symbol } = data;
            priceStreamer.unsubscribe(exchange, symbol);
            socket.emit('unsubscribed', { exchange, symbol });
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            log.info({ socketId: socket.id, reason }, 'Client disconnected');
        });
    });

    // Start server
    httpServer.listen(env.INGESTION_PORT, () => {
        log.info({ port: env.INGESTION_PORT }, '🚀 Ingestion service started');
    });

    // Health check endpoint for Docker
    httpServer.on('request', (req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                subscriptions: priceStreamer.getActiveSubscriptions().length,
                uptime: process.uptime(),
            }));
        }
    });
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
    log.info({ signal }, 'Shutdown signal received');

    priceStreamer?.unsubscribeAll();
    await exchangeAdapter?.disconnectAll();
    await tsWriter?.close();
    await publisher?.disconnect();

    log.info('Graceful shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start
main().catch((err) => {
    log.error({ err }, 'Fatal error during startup');
    process.exit(1);
});
