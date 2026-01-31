/**
 * Rate Limiting Middleware
 * Protects endpoints from abuse using sliding window algorithm
 */

import type { Response, NextFunction } from 'express';
import { checkRateLimit } from '../services/redis.js';
import { env } from '../utils/env.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { ErrorCodes } from '../types/index.js';

interface RateLimitOptions {
    /** Max requests in the window */
    max: number;
    /** Window duration in milliseconds */
    windowMs: number;
    /** Key generator function */
    keyGenerator?: (req: AuthenticatedRequest) => string;
    /** Skip function */
    skip?: (req: AuthenticatedRequest) => boolean;
}

/**
 * Create rate limiting middleware with custom options
 */
export function rateLimit(options: Partial<RateLimitOptions> = {}) {
    const {
        max = env.RATE_LIMIT_MAX_REQUESTS,
        windowMs = env.RATE_LIMIT_WINDOW_MS,
        keyGenerator = defaultKeyGenerator,
        skip,
    } = options;

    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        // Skip if configured
        if (skip?.(req)) {
            next();
            return;
        }

        const key = keyGenerator(req);

        try {
            const result = await checkRateLimit(key, max, windowMs);

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', result.remaining);
            res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

            if (!result.allowed) {
                res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
                res.status(429).json({
                    success: false,
                    error: {
                        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
                        message: 'Too many requests. Please try again later.',
                        details: {
                            retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
                        },
                    },
                } satisfies ApiResponse);
                return;
            }

            next();
        } catch (error) {
            // If rate limiting fails, allow the request but log the error
            console.error('Rate limit check failed:', error);
            next();
        }
    };
}

/**
 * Default key generator - uses IP for unauthenticated, userId for authenticated
 */
function defaultKeyGenerator(req: AuthenticatedRequest): string {
    if (req.user) {
        return `user:${req.user.userId}`;
    }

    // Get IP from various headers (for proxied requests)
    const ip =
        req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
        req.headers['x-real-ip']?.toString() ||
        req.socket.remoteAddress ||
        'unknown';

    return `ip:${ip}`;
}

// ============================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================

/**
 * Strict rate limit for auth endpoints (prevent brute force)
 */
export const authRateLimit = rateLimit({
    max: 10,
    windowMs: 60 * 1000, // 10 requests per minute
    keyGenerator: (req) => {
        const ip =
            req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            'unknown';
        return `auth:${ip}`;
    },
});

/**
 * Rate limit for expensive operations (backtesting)
 */
export const heavyOperationRateLimit = rateLimit({
    max: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    keyGenerator: (req) => {
        if (req.user) {
            return `heavy:${req.user.userId}`;
        }
        return `heavy:ip:${req.socket.remoteAddress}`;
    },
});

/**
 * Rate limit for trading operations
 */
export const tradingRateLimit = rateLimit({
    max: 30,
    windowMs: 60 * 1000, // 30 requests per minute
    keyGenerator: (req) => `trading:${req.user?.userId}`,
});

/**
 * Very strict rate limit for password reset
 */
export const passwordResetRateLimit = rateLimit({
    max: 3,
    windowMs: 60 * 60 * 1000, // 3 requests per hour
    keyGenerator: (req) => {
        const ip =
            req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            'unknown';
        return `pwreset:${ip}`;
    },
});
