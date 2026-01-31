/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user to request
 */

import type { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.js';
import { isTokenBlacklisted } from '../services/redis.js';
import { createLogger } from '../utils/logger.js';
import type { AuthenticatedRequest, JwtPayload, UserRole, SubscriptionTier, ApiResponse } from '../types/index.js';
import { ErrorCodes } from '../types/index.js';

const log = createLogger('AuthMiddleware');

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}

/**
 * Require valid JWT authentication
 */
export async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const token = extractToken(req.headers.authorization);

    if (!token) {
        res.status(401).json({
            success: false,
            error: {
                code: ErrorCodes.TOKEN_INVALID,
                message: 'Authorization header required',
            },
        } satisfies ApiResponse);
        return;
    }

    try {
        // Check if token is blacklisted (logged out)
        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            res.status(401).json({
                success: false,
                error: {
                    code: ErrorCodes.TOKEN_INVALID,
                    message: 'Token has been revoked',
                },
            } satisfies ApiResponse);
            return;
        }

        // Verify token
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid token';
        const code = message.includes('expired')
            ? ErrorCodes.TOKEN_EXPIRED
            : ErrorCodes.TOKEN_INVALID;

        res.status(401).json({
            success: false,
            error: { code, message },
        } satisfies ApiResponse);
    }
}

/**
 * Optional authentication - attaches user if authenticated, but doesn't require it
 */
export async function optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const token = extractToken(req.headers.authorization);

    if (!token) {
        next();
        return;
    }

    try {
        const blacklisted = await isTokenBlacklisted(token);
        if (!blacklisted) {
            req.user = verifyAccessToken(token);
        }
    } catch {
        // Ignore errors for optional auth
    }

    next();
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: ErrorCodes.TOKEN_INVALID,
                    message: 'Authentication required',
                },
            } satisfies ApiResponse);
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions',
                },
            } satisfies ApiResponse);
            return;
        }

        next();
    };
}

/**
 * Require specific subscription tier(s)
 */
export function requireSubscription(...tiers: SubscriptionTier[]) {
    // Tier hierarchy for comparison
    const tierLevel: Record<SubscriptionTier, number> = {
        free: 0,
        starter: 1,
        pro: 2,
        enterprise: 3,
    };

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: ErrorCodes.TOKEN_INVALID,
                    message: 'Authentication required',
                },
            } satisfies ApiResponse);
            return;
        }

        const userLevel = tierLevel[req.user.subscription];
        const requiredLevel = Math.min(...tiers.map(t => tierLevel[t]));

        if (userLevel < requiredLevel) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'SUBSCRIPTION_REQUIRED',
                    message: `This feature requires ${tiers.join(' or ')} subscription`,
                },
            } satisfies ApiResponse);
            return;
        }

        next();
    };
}
