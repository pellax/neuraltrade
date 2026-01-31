/**
 * Health Check Routes
 * System health and status endpoints
 */

import { Router, Response, Request } from 'express';
import { mongoHealthCheck } from '../services/mongodb.js';
import { redisHealthCheck } from '../services/redis.js';
import { env } from '../utils/env.js';
import type { ApiResponse } from '../types/index.js';

const router = Router();

const startTime = Date.now();

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    timestamp: string;
    checks: {
        mongodb: boolean;
        redis: boolean;
    };
}

/**
 * GET /health
 * Basic health check for load balancers
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    const [mongoOk, redisOk] = await Promise.all([
        mongoHealthCheck(),
        redisHealthCheck(),
    ]);

    const allHealthy = mongoOk && redisOk;
    const status: HealthStatus['status'] = allHealthy
        ? 'healthy'
        : (mongoOk || redisOk) ? 'degraded' : 'unhealthy';

    const health: HealthStatus = {
        status,
        version: '0.1.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
        checks: {
            mongodb: mongoOk,
            redis: redisOk,
        },
    };

    const httpStatus = status === 'unhealthy' ? 503 : 200;

    res.status(httpStatus).json({
        success: status !== 'unhealthy',
        data: health,
    } satisfies ApiResponse);
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes
 */
router.get('/live', (req: Request, res: Response): void => {
    res.json({ status: 'alive' });
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
    const [mongoOk, redisOk] = await Promise.all([
        mongoHealthCheck(),
        redisHealthCheck(),
    ]);

    if (mongoOk && redisOk) {
        res.json({ status: 'ready' });
    } else {
        res.status(503).json({
            status: 'not ready',
            checks: { mongodb: mongoOk, redis: redisOk },
        });
    }
});

export default router;
