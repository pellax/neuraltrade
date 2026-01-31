/**
 * Strategy Routes
 * CRUD operations for trading strategies
 */

import { Router, Response } from 'express';
import {
    createStrategy,
    getStrategies,
    getStrategyById,
    updateStrategy,
    deleteStrategy,
    deployStrategy,
    stopStrategy,
    pauseStrategy,
    resumeStrategy,
} from '../services/strategy.js';
import { requireAuth } from '../middleware/auth.js';
import { heavyOperationRateLimit, tradingRateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import {
    createStrategySchema,
    updateStrategySchema,
    deployStrategySchema,
    backtestSchema,
    paginationSchema,
} from '../types/schemas.js';
import type { AuthenticatedRequest, ApiResponse, StrategyStatus } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const log = createLogger('StrategyRoutes');

// All routes require authentication
router.use(requireAuth);

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * GET /strategies
 * List all strategies for the authenticated user
 */
router.get(
    '/',
    validateQuery(paginationSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const status = req.query.status as StrategyStatus | undefined;
            const result = await getStrategies(
                req.user!.userId,
                req.query as any,
                status
            );

            res.json({
                success: true,
                data: result.items,
                meta: result.pagination,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get strategies';
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /strategies
 * Create a new strategy
 */
router.post(
    '/',
    validateBody(createStrategySchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await createStrategy(
                req.user!.userId,
                req.user!.subscription,
                req.body
            );

            res.status(201).json({
                success: true,
                data: strategy,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create strategy';
            const status = message.includes('limit') ? 403 : 400;

            res.status(status).json({
                success: false,
                error: {
                    code: message.includes('limit') ? 'STRATEGY_1202' : 'STRATEGY_1203',
                    message,
                },
            } satisfies ApiResponse);
        }
    }
);

/**
 * GET /strategies/:id
 * Get a specific strategy
 */
router.get(
    '/:id',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await getStrategyById(req.params.id, req.user!.userId);

            if (!strategy) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: strategy,
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to get strategy' },
            } satisfies ApiResponse);
        }
    }
);

/**
 * PATCH /strategies/:id
 * Update a strategy
 */
router.patch(
    '/:id',
    validateBody(updateStrategySchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await updateStrategy(
                req.params.id,
                req.user!.userId,
                req.body
            );

            if (!strategy) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: strategy,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update strategy';
            res.status(400).json({
                success: false,
                error: { code: 'STRATEGY_1203', message },
            } satisfies ApiResponse);
        }
    }
);

/**
 * DELETE /strategies/:id
 * Delete a strategy
 */
router.delete(
    '/:id',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const deleted = await deleteStrategy(req.params.id, req.user!.userId);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: { message: 'Strategy deleted' },
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete strategy';
            res.status(400).json({
                success: false,
                error: { code: 'STRATEGY_1203', message },
            } satisfies ApiResponse);
        }
    }
);

// ============================================
// STRATEGY LIFECYCLE
// ============================================

/**
 * POST /strategies/:id/deploy
 * Deploy a strategy (start live trading)
 */
router.post(
    '/:id/deploy',
    tradingRateLimit,
    validateBody(deployStrategySchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await deployStrategy(
                req.params.id,
                req.user!.userId,
                req.body.apiKeyId,
                req.body.dryRun
            );

            if (!strategy) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            log.info(
                { userId: req.user!.userId, strategyId: req.params.id },
                'Strategy deployed'
            );

            res.json({
                success: true,
                data: strategy,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to deploy strategy';
            res.status(400).json({
                success: false,
                error: { code: 'STRATEGY_1203', message },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /strategies/:id/stop
 * Stop a running strategy
 */
router.post(
    '/:id/stop',
    tradingRateLimit,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await stopStrategy(req.params.id, req.user!.userId);

            if (!strategy) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            log.info(
                { userId: req.user!.userId, strategyId: req.params.id },
                'Strategy stopped'
            );

            res.json({
                success: true,
                data: strategy,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to stop strategy';
            res.status(400).json({
                success: false,
                error: { code: 'STRATEGY_1203', message },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /strategies/:id/pause
 * Pause a running strategy
 */
router.post(
    '/:id/pause',
    tradingRateLimit,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await pauseStrategy(req.params.id, req.user!.userId);

            if (!strategy) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: strategy,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to pause strategy';
            res.status(400).json({
                success: false,
                error: { code: 'STRATEGY_1203', message },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /strategies/:id/resume
 * Resume a paused strategy
 */
router.post(
    '/:id/resume',
    tradingRateLimit,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await resumeStrategy(req.params.id, req.user!.userId);

            if (!strategy) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: strategy,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to resume strategy';
            res.status(400).json({
                success: false,
                error: { code: 'STRATEGY_1203', message },
            } satisfies ApiResponse);
        }
    }
);

// ============================================
// BACKTESTING
// ============================================

/**
 * POST /strategies/:id/backtest
 * Run a backtest on a strategy
 */
router.post(
    '/:id/backtest',
    heavyOperationRateLimit,
    validateBody(backtestSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const strategy = await getStrategyById(req.params.id, req.user!.userId);

            if (!strategy) {
                res.status(404).json({
                    success: false,
                    error: { code: 'STRATEGY_1201', message: 'Strategy not found' },
                } satisfies ApiResponse);
                return;
            }

            // TODO: Send backtest job to worker via RabbitMQ
            // For now, return a job ID
            const jobId = `bt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            log.info(
                { userId: req.user!.userId, strategyId: req.params.id, jobId },
                'Backtest job queued'
            );

            res.status(202).json({
                success: true,
                data: {
                    jobId,
                    status: 'queued',
                    message: 'Backtest job queued. Check status via GET /backtests/:jobId',
                },
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to queue backtest';
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message },
            } satisfies ApiResponse);
        }
    }
);

export default router;
