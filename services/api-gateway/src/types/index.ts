/**
 * API Types & Interfaces
 * Core type definitions for the API Gateway
 */

import type { Request as ExpressRequest } from 'express';

// ============================================
// USER TYPES
// ============================================

export interface User {
    _id: string;
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    subscription: SubscriptionTier;
    emailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'superadmin';

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface UserPublic {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    subscription: SubscriptionTier;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    createdAt: Date;
}

// ============================================
// AUTH TYPES
// ============================================

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    subscription: SubscriptionTier;
    iat?: number;
    exp?: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface RefreshToken {
    _id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt?: Date;
    userAgent?: string;
    ip?: string;
}

// ============================================
// API KEY TYPES
// ============================================

export interface ExchangeApiKey {
    _id: string;
    userId: string;
    exchange: SupportedExchange;
    label: string;
    encryptedCredentials: string;
    permissions: ApiKeyPermission[];
    isActive: boolean;
    lastUsedAt?: Date;
    createdAt: Date;
}

export type SupportedExchange = 'binance' | 'coinbase' | 'kraken' | 'bybit' | 'bitget';

export type ApiKeyPermission = 'read' | 'trade' | 'withdraw';

// ============================================
// STRATEGY TYPES
// ============================================

export interface Strategy {
    _id: string;
    userId: string;
    name: string;
    description?: string;
    type: StrategyType;
    status: StrategyStatus;
    config: StrategyConfig;
    assetPairs: string[];
    exchange: SupportedExchange;
    riskSettings: RiskSettings;
    performance?: PerformanceMetrics;
    createdAt: Date;
    updatedAt: Date;
}

export type StrategyType = 'trend_following' | 'mean_reversion' | 'breakout' | 'ml_signal' | 'custom';

export type StrategyStatus = 'draft' | 'backtesting' | 'active' | 'paused' | 'stopped' | 'error';

export interface StrategyConfig {
    indicators?: IndicatorConfig[];
    entryConditions?: string;
    exitConditions?: string;
    timeframe: string;
    mlModelId?: string;
    customCode?: string;
}

export interface IndicatorConfig {
    name: string;
    params: Record<string, number>;
}

export interface RiskSettings {
    maxPositionSize: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDailyLoss: number;
    maxConcurrentTrades: number;
}

export interface PerformanceMetrics {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalPnlPercent: number;
    lastUpdated: Date;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface AuthenticatedRequest extends ExpressRequest {
    user?: JwtPayload;
    requestId?: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        requestId?: string;
    };
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
    // Auth errors (1000-1099)
    INVALID_CREDENTIALS: 'AUTH_1001',
    TOKEN_EXPIRED: 'AUTH_1002',
    TOKEN_INVALID: 'AUTH_1003',
    REFRESH_TOKEN_INVALID: 'AUTH_1004',
    TWO_FACTOR_REQUIRED: 'AUTH_1005',
    TWO_FACTOR_INVALID: 'AUTH_1006',
    EMAIL_NOT_VERIFIED: 'AUTH_1007',

    // User errors (1100-1199)
    USER_NOT_FOUND: 'USER_1101',
    USER_ALREADY_EXISTS: 'USER_1102',
    USER_EMAIL_TAKEN: 'USER_1103',

    // Strategy errors (1200-1299)
    STRATEGY_NOT_FOUND: 'STRATEGY_1201',
    STRATEGY_LIMIT_REACHED: 'STRATEGY_1202',
    STRATEGY_INVALID_CONFIG: 'STRATEGY_1203',

    // API Key errors (1300-1399)
    API_KEY_NOT_FOUND: 'APIKEY_1301',
    API_KEY_INVALID: 'APIKEY_1302',
    API_KEY_LIMIT_REACHED: 'APIKEY_1303',

    // Validation errors (2000-2099)
    VALIDATION_FAILED: 'VALIDATION_2001',
    INVALID_INPUT: 'VALIDATION_2002',

    // Rate limiting (3000-3099)
    RATE_LIMIT_EXCEEDED: 'RATE_3001',

    // Server errors (5000-5099)
    INTERNAL_ERROR: 'SERVER_5001',
    SERVICE_UNAVAILABLE: 'SERVER_5002',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
