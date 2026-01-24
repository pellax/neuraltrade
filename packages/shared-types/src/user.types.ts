/**
 * User & Authentication Types
 */

import type { Exchange } from './market.types.js';

/** User roles */
export type UserRole = 'user' | 'premium' | 'admin';

/** User account status */
export type UserStatus = 'active' | 'suspended' | 'pending_verification';

/** User profile */
export interface User {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    status: UserStatus;
    preferences: UserPreferences;
    createdAt: number;
    updatedAt: number;
    lastLoginAt: number;
}

/** User preferences */
export interface UserPreferences {
    theme: 'dark' | 'light';
    defaultExchange: Exchange;
    defaultTimeframe: string;
    notifications: {
        email: boolean;
        push: boolean;
        signalAlerts: boolean;
        tradeExecutions: boolean;
    };
    riskSettings: {
        maxPositionSize: number;     // Percentage of portfolio
        maxDailyLoss: number;        // Percentage
        maxOpenPositions: number;
    };
}

/** Encrypted API key entry */
export interface EncryptedApiKey {
    id: string;
    userId: string;
    exchange: Exchange;
    label: string;
    encryptedKey: string;          // AES-256 encrypted
    encryptedSecret: string;       // AES-256 encrypted
    permissions: ApiKeyPermissions;
    isActive: boolean;
    lastUsedAt: number;
    createdAt: number;
}

/** API key permissions (read from exchange) */
export interface ApiKeyPermissions {
    canTrade: boolean;
    canWithdraw: boolean;
    canReadBalance: boolean;
    ipRestricted: boolean;
}

/** JWT Token payload */
export interface JWTPayload {
    sub: string;           // User ID
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}

/** Authentication response */
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: Omit<User, 'preferences'>;
}
