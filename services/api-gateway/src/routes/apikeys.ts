/**
 * API Keys Routes
 * Manage exchange API keys
 */

import { Router, Response } from 'express';
import {
    createApiKey,
    getApiKeys,
    getApiKeyById,
    updateApiKey,
    deleteApiKey,
    testApiKeyConnection,
} from '../services/apikeys.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { createApiKeySchema } from '../types/schemas.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();
const log = createLogger('ApiKeyRoutes');

// All routes require authentication
router.use(requireAuth);

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * GET /api-keys
 * List all API keys for the authenticated user
 */
router.get(
    '/',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const keys = await getApiKeys(req.user!.userId);

            res.json({
                success: true,
                data: keys,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get API keys';
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /api-keys
 * Create a new API key
 */
router.post(
    '/',
    validateBody(createApiKeySchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const apiKey = await createApiKey(
                req.user!.userId,
                req.user!.subscription,
                req.body
            );

            log.info(
                { userId: req.user!.userId, exchange: req.body.exchange },
                'API key created'
            );

            res.status(201).json({
                success: true,
                data: apiKey,
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create API key';
            const status = message.includes('limit') ? 403 : 400;

            res.status(status).json({
                success: false,
                error: {
                    code: message.includes('limit') ? 'APIKEY_1303' : 'APIKEY_1302',
                    message,
                },
            } satisfies ApiResponse);
        }
    }
);

/**
 * GET /api-keys/:id
 * Get a specific API key
 */
router.get(
    '/:id',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const apiKey = await getApiKeyById(req.params.id, req.user!.userId);

            if (!apiKey) {
                res.status(404).json({
                    success: false,
                    error: { code: 'APIKEY_1301', message: 'API key not found' },
                } satisfies ApiResponse);
                return;
            }

            // Remove sensitive data
            const { encryptedCredentials, ...safeKey } = apiKey;

            res.json({
                success: true,
                data: safeKey,
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to get API key' },
            } satisfies ApiResponse);
        }
    }
);

// Update schema
const updateApiKeySchema = z.object({
    label: z.string().min(1).max(50).optional(),
    permissions: z.array(z.enum(['read', 'trade', 'withdraw'])).min(1).optional(),
    isActive: z.boolean().optional(),
});

/**
 * PATCH /api-keys/:id
 * Update an API key
 */
router.patch(
    '/:id',
    validateBody(updateApiKeySchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const updated = await updateApiKey(
                req.params.id,
                req.user!.userId,
                req.body
            );

            if (!updated) {
                res.status(404).json({
                    success: false,
                    error: { code: 'APIKEY_1301', message: 'API key not found' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: { message: 'API key updated' },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to update API key' },
            } satisfies ApiResponse);
        }
    }
);

/**
 * DELETE /api-keys/:id
 * Delete an API key
 */
router.delete(
    '/:id',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const deleted = await deleteApiKey(req.params.id, req.user!.userId);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: { code: 'APIKEY_1301', message: 'API key not found' },
                } satisfies ApiResponse);
                return;
            }

            log.info(
                { userId: req.user!.userId, apiKeyId: req.params.id },
                'API key deleted'
            );

            res.json({
                success: true,
                data: { message: 'API key deleted' },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to delete API key' },
            } satisfies ApiResponse);
        }
    }
);

// ============================================
// CONNECTION TESTING
// ============================================

/**
 * POST /api-keys/:id/test
 * Test API key connectivity to exchange
 */
router.post(
    '/:id/test',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const result = await testApiKeyConnection(req.params.id, req.user!.userId);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: { code: 'APIKEY_1302', message: result.error || 'Connection failed' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: {
                    connected: true,
                    balance: result.balance,
                },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Connection test failed' },
            } satisfies ApiResponse);
        }
    }
);

export default router;
