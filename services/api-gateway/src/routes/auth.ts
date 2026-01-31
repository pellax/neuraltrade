/**
 * Authentication Routes
 * Handles registration, login, logout, token refresh, and 2FA
 */

import { Router, Response } from 'express';
import {
    createUser,
    authenticateUser,
    refreshAccessToken,
    logout,
    findUserById,
    generate2FASecret,
    enable2FA,
    disable2FA,
    toPublicUser,
    verifyEmail,
    resendVerificationEmail,
    generatePasswordResetToken,
    resetPassword,
} from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit, passwordResetRateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validation.js';
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    verify2faSchema,
    emailSchema,
    resetPasswordSchema,
} from '../types/schemas.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const log = createLogger('AuthRoutes');

// ============================================
// REGISTRATION & LOGIN
// ============================================

/**
 * POST /auth/register
 * Create a new user account
 */
router.post(
    '/register',
    authRateLimit,
    validateBody(registerSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const user = await createUser(req.body);

            res.status(201).json({
                success: true,
                data: { user },
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';

            res.status(400).json({
                success: false,
                error: {
                    code: message.includes('already') ? 'USER_1102' : 'VALIDATION_2001',
                    message,
                },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post(
    '/login',
    authRateLimit,
    validateBody(loginSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await authenticateUser(req.body, ip, userAgent);

            if ('requires2fa' in result) {
                res.status(200).json({
                    success: true,
                    data: { requires2fa: true },
                } satisfies ApiResponse);
                return;
            }

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({
                success: true,
                data: {
                    user: result.user,
                    accessToken: result.tokens.accessToken,
                    expiresIn: result.tokens.expiresIn,
                },
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';

            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_1001',
                    message,
                },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
    '/refresh',
    validateBody(refreshTokenSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            // Try body first, then cookie
            const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'AUTH_1004',
                        message: 'Refresh token required',
                    },
                } satisfies ApiResponse);
                return;
            }

            const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const tokens = await refreshAccessToken(refreshToken, ip, userAgent);

            // Update cookie
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.json({
                success: true,
                data: {
                    accessToken: tokens.accessToken,
                    expiresIn: tokens.expiresIn,
                },
            } satisfies ApiResponse);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Token refresh failed';

            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_1004',
                    message,
                },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /auth/logout
 * Logout and invalidate tokens
 */
router.post(
    '/logout',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const accessToken = req.headers.authorization?.replace('Bearer ', '');
            const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

            await logout(accessToken!, refreshToken);

            // Clear cookie
            res.clearCookie('refreshToken');

            res.json({
                success: true,
                data: { message: 'Logged out successfully' },
            } satisfies ApiResponse);
        } catch (error) {
            // Still return success even if there's an error
            res.json({
                success: true,
                data: { message: 'Logged out' },
            } satisfies ApiResponse);
        }
    }
);

// ============================================
// TWO-FACTOR AUTHENTICATION
// ============================================

/**
 * POST /auth/2fa/setup
 * Generate 2FA secret and QR code
 */
router.post(
    '/2fa/setup',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const user = await findUserById(req.user!.userId);

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: { code: 'USER_1101', message: 'User not found' },
                } satisfies ApiResponse);
                return;
            }

            if (user.twoFactorEnabled) {
                res.status(400).json({
                    success: false,
                    error: { code: 'AUTH_1006', message: '2FA is already enabled' },
                } satisfies ApiResponse);
                return;
            }

            const setup = await generate2FASecret(user);

            res.json({
                success: true,
                data: {
                    secret: setup.secret,
                    qrCode: setup.qrCodeDataUrl,
                },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to generate 2FA secret' },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /auth/2fa/enable
 * Verify code and enable 2FA
 */
router.post(
    '/2fa/enable',
    requireAuth,
    validateBody(verify2faSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { code, secret } = req.body;

            if (!secret) {
                res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_2001', message: 'Secret is required' },
                } satisfies ApiResponse);
                return;
            }

            const success = await enable2FA(req.user!.userId, secret, code);

            if (!success) {
                res.status(400).json({
                    success: false,
                    error: { code: 'AUTH_1006', message: 'Invalid verification code' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: { message: '2FA enabled successfully' },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to enable 2FA' },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /auth/2fa/disable
 * Disable 2FA (requires password verification)
 */
router.post(
    '/2fa/disable',
    requireAuth,
    validateBody(verify2faSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            await disable2FA(req.user!.userId);

            res.json({
                success: true,
                data: { message: '2FA disabled successfully' },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to disable 2FA' },
            } satisfies ApiResponse);
        }
    }
);

// ============================================
// CURRENT USER
// ============================================

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get(
    '/me',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const user = await findUserById(req.user!.userId);

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: { code: 'USER_1101', message: 'User not found' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: { user: toPublicUser(user) },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to get user' },
            } satisfies ApiResponse);
        }
    }
);

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * GET /auth/verify-email/:token
 * Verify email with token
 */
router.get(
    '/verify-email/:token',
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { token } = req.params;

            const verified = await verifyEmail(token);

            if (!verified) {
                res.status(400).json({
                    success: false,
                    error: { code: 'AUTH_1007', message: 'Invalid or expired verification token' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: { message: 'Email verified successfully. You can now log in.' },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to verify email' },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /auth/resend-verification
 * Resend verification email
 */
router.post(
    '/resend-verification',
    authRateLimit,
    validateBody(emailSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { email } = req.body;
            const result = await resendVerificationEmail(email);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: { code: 'AUTH_1008', message: result.message },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: { message: result.message },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to resend verification email' },
            } satisfies ApiResponse);
        }
    }
);

// ============================================
// PASSWORD RESET
// ============================================

/**
 * POST /auth/forgot-password
 * Request password reset email
 */
router.post(
    '/forgot-password',
    passwordResetRateLimit,
    validateBody(emailSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { email } = req.body;
            const result = await generatePasswordResetToken(email);

            // Always return success to prevent email enumeration
            res.json({
                success: true,
                data: { message: result.message },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to process password reset request' },
            } satisfies ApiResponse);
        }
    }
);

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post(
    '/reset-password',
    validateBody(resetPasswordSchema),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { token, newPassword } = req.body;

            const success = await resetPassword(token, newPassword);

            if (!success) {
                res.status(400).json({
                    success: false,
                    error: { code: 'AUTH_1009', message: 'Invalid or expired reset token' },
                } satisfies ApiResponse);
                return;
            }

            res.json({
                success: true,
                data: { message: 'Password reset successfully. You can now log in with your new password.' },
            } satisfies ApiResponse);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: { code: 'SERVER_5001', message: 'Failed to reset password' },
            } satisfies ApiResponse);
        }
    }
);

export default router;

