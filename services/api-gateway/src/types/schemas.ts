/**
 * Request Validation Schemas using Zod
 * All API request payloads are validated here
 */

import { z } from 'zod';

// ============================================
// AUTH SCHEMAS
// ============================================

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    twoFactorCode: z.string().length(6).optional(),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const enable2faSchema = z.object({
    password: z.string().min(1, 'Password is required'),
});

export const verify2faSchema = z.object({
    code: z.string().length(6, 'Code must be 6 digits'),
    secret: z.string().optional(),
});

export const resetPasswordRequestSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const emailSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

// ============================================
// USER SCHEMAS
// ============================================

export const updateProfileSchema = z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
});

// ============================================
// API KEY SCHEMAS
// ============================================

export const createApiKeySchema = z.object({
    exchange: z.enum(['binance', 'coinbase', 'kraken', 'bybit', 'bitget']),
    label: z.string().min(1).max(50),
    apiKey: z.string().min(10).max(200),
    apiSecret: z.string().min(10).max(200),
    permissions: z.array(z.enum(['read', 'trade', 'withdraw'])).min(1),
});

// ============================================
// STRATEGY SCHEMAS
// ============================================

const riskSettingsSchema = z.object({
    maxPositionSize: z.number().min(0.01).max(100).default(10),
    stopLossPercent: z.number().min(0.1).max(50).default(2),
    takeProfitPercent: z.number().min(0.1).max(100).default(4),
    maxDailyLoss: z.number().min(1).max(100).default(10),
    maxConcurrentTrades: z.number().int().min(1).max(100).default(5),
});

const indicatorConfigSchema = z.object({
    name: z.string().min(1),
    params: z.record(z.number()),
});

const strategyConfigSchema = z.object({
    indicators: z.array(indicatorConfigSchema).optional(),
    entryConditions: z.string().optional(),
    exitConditions: z.string().optional(),
    timeframe: z.string().default('1h'),
    mlModelId: z.string().optional(),
    customCode: z.string().max(10000).optional(),
});

export const createStrategySchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    type: z.enum(['trend_following', 'mean_reversion', 'breakout', 'ml_signal', 'custom']),
    assetPairs: z.array(z.string().regex(/^[A-Z]+\/[A-Z]+$/)).min(1).max(20),
    exchange: z.enum(['binance', 'coinbase', 'kraken', 'bybit', 'bitget']),
    config: strategyConfigSchema,
    riskSettings: riskSettingsSchema.optional(),
});

export const updateStrategySchema = createStrategySchema.partial();

export const deployStrategySchema = z.object({
    apiKeyId: z.string().min(1, 'API Key is required'),
    dryRun: z.boolean().default(false),
});

// ============================================
// BACKTEST SCHEMAS
// ============================================

export const backtestSchema = z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    initialCapital: z.number().min(100).max(10000000).default(10000),
    commission: z.number().min(0).max(1).default(0.001),
});

// ============================================
// PAGINATION SCHEMA
// ============================================

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
export type BacktestInput = z.infer<typeof backtestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
