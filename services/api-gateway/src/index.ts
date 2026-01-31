/**
 * NeuralTrade API Gateway
 * Main entry point for the Express server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

import { env, isDev } from './utils/env.js';
import { createLogger } from './utils/logger.js';
import { connectMongo, disconnectMongo } from './services/mongodb.js';
import { connectRedis, disconnectRedis } from './services/redis.js';
import { requestId, errorHandler, notFoundHandler } from './middleware/validation.js';
import { rateLimit } from './middleware/rateLimit.js';

// Routes
import authRoutes from './routes/auth.js';
import strategyRoutes from './routes/strategies.js';
import apikeysRoutes from './routes/apikeys.js';
import healthRoutes from './routes/health.js';

const log = createLogger('Server');

// Create Express app
const app = express();
const httpServer = createServer(app);

// Create Socket.IO server for real-time updates
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: isDev ? '*' : [],
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: isDev ? false : undefined,
}));

// CORS
app.use(cors({
    origin: isDev ? '*' : [],
    credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Request ID for tracing
app.use(requestId);

// Global rate limiting
app.use(rateLimit());

// Request logging
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        log.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            requestId: (req as any).requestId,
        }, 'Request completed');
    });

    next();
});

// ============================================
// ROUTES
// ============================================

// Health check (no rate limit)
app.use('/health', healthRoutes);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/strategies', strategyRoutes);
app.use('/api/v1/api-keys', apikeysRoutes);

// OpenAPI docs (development only)
if (isDev) {
    app.get('/api/docs', (_req, res) => {
        res.json({
            openapi: '3.0.0',
            info: {
                title: 'NeuralTrade API',
                version: '1.0.0',
                description: 'AI-Powered Trading Platform API',
            },
            servers: [
                { url: `http://localhost:${env.PORT}`, description: 'Development' },
            ],
            paths: {
                '/api/v1/auth/register': { post: { summary: 'Register new user' } },
                '/api/v1/auth/login': { post: { summary: 'Login user' } },
                '/api/v1/auth/refresh': { post: { summary: 'Refresh access token' } },
                '/api/v1/auth/logout': { post: { summary: 'Logout user' } },
                '/api/v1/auth/me': { get: { summary: 'Get current user' } },
                '/api/v1/strategies': {
                    get: { summary: 'List strategies' },
                    post: { summary: 'Create strategy' },
                },
                '/api/v1/strategies/{id}': {
                    get: { summary: 'Get strategy' },
                    patch: { summary: 'Update strategy' },
                    delete: { summary: 'Delete strategy' },
                },
                '/api/v1/strategies/{id}/deploy': { post: { summary: 'Deploy strategy' } },
                '/api/v1/strategies/{id}/stop': { post: { summary: 'Stop strategy' } },
                '/api/v1/strategies/{id}/backtest': { post: { summary: 'Run backtest' } },
                '/api/v1/api-keys': {
                    get: { summary: 'List API keys' },
                    post: { summary: 'Create API key' },
                },
                '/api/v1/api-keys/{id}': {
                    get: { summary: 'Get API key' },
                    patch: { summary: 'Update API key' },
                    delete: { summary: 'Delete API key' },
                },
                '/api/v1/api-keys/{id}/test': { post: { summary: 'Test API key connection' } },
            },
        });
    });
}

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// ============================================
// SOCKET.IO
// ============================================

io.on('connection', (socket) => {
    log.info({ socketId: socket.id }, 'WebSocket client connected');

    socket.on('subscribe', (channels: string[]) => {
        channels.forEach(channel => socket.join(channel));
        log.debug({ socketId: socket.id, channels }, 'Client subscribed');
    });

    socket.on('unsubscribe', (channels: string[]) => {
        channels.forEach(channel => socket.leave(channel));
    });

    socket.on('disconnect', () => {
        log.info({ socketId: socket.id }, 'WebSocket client disconnected');
    });
});

// Export io for use in other modules
export { io };

// ============================================
// LIFECYCLE
// ============================================

async function start(): Promise<void> {
    log.info('Starting NeuralTrade API Gateway...');

    try {
        // Connect to databases
        await connectMongo();
        await connectRedis();

        // Start server
        httpServer.listen(env.PORT, () => {
            log.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 API Gateway started');
        });
    } catch (error) {
        log.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}

async function shutdown(signal: string): Promise<void> {
    log.info({ signal }, 'Shutdown signal received');

    // Close HTTP server
    httpServer.close();

    // Disconnect from databases
    await disconnectMongo();
    await disconnectRedis();

    log.info('Graceful shutdown complete');
    process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log.error({ error }, 'Uncaught exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    log.error({ reason }, 'Unhandled rejection');
});

// Start the server
start();
