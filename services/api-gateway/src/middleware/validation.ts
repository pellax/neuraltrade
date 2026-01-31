/**
 * Request Validation Middleware
 * Validates request bodies using Zod schemas
 */

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';
import { ErrorCodes } from '../types/index.js';

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = formatZodErrors(result.error);
            res.status(400).json({
                success: false,
                error: {
                    code: ErrorCodes.VALIDATION_FAILED,
                    message: 'Validation failed',
                    details: errors,
                },
            } satisfies ApiResponse);
            return;
        }

        // Replace body with validated data (includes defaults)
        req.body = result.data;
        next();
    };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            const errors = formatZodErrors(result.error);
            res.status(400).json({
                success: false,
                error: {
                    code: ErrorCodes.VALIDATION_FAILED,
                    message: 'Invalid query parameters',
                    details: errors,
                },
            } satisfies ApiResponse);
            return;
        }

        // Replace query with validated data
        req.query = result.data as unknown as typeof req.query;
        next();
    };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const errors = formatZodErrors(result.error);
            res.status(400).json({
                success: false,
                error: {
                    code: ErrorCodes.VALIDATION_FAILED,
                    message: 'Invalid URL parameters',
                    details: errors,
                },
            } satisfies ApiResponse);
            return;
        }

        req.params = result.data as typeof req.params;
        next();
    };
}

/**
 * Format Zod errors into a more readable format
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    for (const issue of error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!formatted[path]) {
            formatted[path] = [];
        }
        formatted[path].push(issue.message);
    }

    return formatted;
}

/**
 * Add request ID for tracing
 */
export function requestId(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const id = req.headers['x-request-id']?.toString() || uuidv4();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
}

/**
 * Error handler middleware
 */
export function errorHandler(
    error: Error,
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): void {
    console.error('Unhandled error:', error);

    // Already sent response
    if (res.headersSent) {
        return;
    }

    res.status(500).json({
        success: false,
        error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
        },
        meta: {
            requestId: req.requestId,
        },
    } satisfies ApiResponse);
}

/**
 * 404 handler
 */
export function notFoundHandler(
    req: AuthenticatedRequest,
    res: Response
): void {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
        meta: {
            requestId: req.requestId,
        },
    } satisfies ApiResponse);
}
