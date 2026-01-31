/**
 * API Keys Service
 * Manages encrypted exchange API keys
 */

import { ObjectId } from 'mongodb';
import { getCollections } from './mongodb.js';
import { encryptApiKey, decryptApiKey } from '../utils/crypto.js';
import { createLogger } from '../utils/logger.js';
import type { ExchangeApiKey, SupportedExchange, ApiKeyPermission } from '../types/index.js';
import type { CreateApiKeyInput } from '../types/schemas.js';

const log = createLogger('ApiKeyService');

// API key limits by subscription tier
const API_KEY_LIMITS: Record<string, number> = {
    free: 1,
    starter: 5,
    pro: 20,
    enterprise: 100,
};

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new API key (encrypted)
 */
export async function createApiKey(
    userId: string,
    subscription: string,
    input: CreateApiKeyInput
): Promise<Omit<ExchangeApiKey, 'encryptedCredentials'> & { maskedApiKey: string }> {
    const { apiKeys } = getCollections();

    // Check API key limit
    const userKeys = await apiKeys.countDocuments({ userId });
    const limit = API_KEY_LIMITS[subscription] || API_KEY_LIMITS.free;

    if (userKeys >= limit) {
        throw new Error(`API key limit reached (${limit}). Upgrade your subscription for more.`);
    }

    // Check for duplicate exchange/label
    const existing = await apiKeys.findOne({
        userId,
        exchange: input.exchange,
        label: input.label,
    });

    if (existing) {
        throw new Error('An API key with this label already exists for this exchange');
    }

    // Encrypt credentials
    const encryptedCredentials = encryptApiKey(input.apiKey, input.apiSecret);

    const now = new Date();
    const apiKeyDoc: Omit<ExchangeApiKey, '_id'> = {
        userId,
        exchange: input.exchange,
        label: input.label,
        encryptedCredentials,
        permissions: input.permissions,
        isActive: true,
        createdAt: now,
    };

    const result = await apiKeys.insertOne(apiKeyDoc as ExchangeApiKey);

    log.info({ userId, exchange: input.exchange }, 'API key created');

    // Return without sensitive data
    return {
        _id: result.insertedId.toString(),
        userId,
        exchange: input.exchange,
        label: input.label,
        permissions: input.permissions,
        isActive: true,
        createdAt: now,
        maskedApiKey: maskApiKey(input.apiKey),
    };
}

/**
 * Get all API keys for a user (without decrypted credentials)
 */
export async function getApiKeys(
    userId: string
): Promise<Array<Omit<ExchangeApiKey, 'encryptedCredentials'>>> {
    const { apiKeys } = getCollections();

    const keys = await apiKeys.find({ userId }).toArray();

    // Remove encrypted credentials from response
    return keys.map(key => {
        const { encryptedCredentials, ...rest } = key;
        return rest;
    });
}

/**
 * Get a single API key by ID
 */
export async function getApiKeyById(
    apiKeyId: string,
    userId: string
): Promise<ExchangeApiKey | null> {
    const { apiKeys } = getCollections();

    return apiKeys.findOne({
        _id: new ObjectId(apiKeyId) as unknown as string,
        userId,
    });
}

/**
 * Get decrypted credentials (for trading operations only)
 * This should only be called internally by trading services
 */
export async function getDecryptedCredentials(
    apiKeyId: string,
    userId: string
): Promise<{ apiKey: string; apiSecret: string; exchange: SupportedExchange } | null> {
    const apiKeyDoc = await getApiKeyById(apiKeyId, userId);

    if (!apiKeyDoc || !apiKeyDoc.isActive) {
        return null;
    }

    const credentials = decryptApiKey(apiKeyDoc.encryptedCredentials);

    // Update last used
    const { apiKeys } = getCollections();
    await apiKeys.updateOne(
        { _id: new ObjectId(apiKeyId) as unknown as string },
        { $set: { lastUsedAt: new Date() } }
    );

    return {
        ...credentials,
        exchange: apiKeyDoc.exchange,
    };
}

/**
 * Update API key (label, permissions, active status)
 */
export async function updateApiKey(
    apiKeyId: string,
    userId: string,
    updates: Partial<Pick<ExchangeApiKey, 'label' | 'permissions' | 'isActive'>>
): Promise<boolean> {
    const { apiKeys } = getCollections();

    const result = await apiKeys.updateOne(
        {
            _id: new ObjectId(apiKeyId) as unknown as string,
            userId,
        },
        { $set: updates }
    );

    if (result.modifiedCount > 0) {
        log.info({ userId, apiKeyId }, 'API key updated');
        return true;
    }

    return false;
}

/**
 * Delete an API key
 */
export async function deleteApiKey(apiKeyId: string, userId: string): Promise<boolean> {
    const { apiKeys } = getCollections();

    const result = await apiKeys.deleteOne({
        _id: new ObjectId(apiKeyId) as unknown as string,
        userId,
    });

    if (result.deletedCount > 0) {
        log.info({ userId, apiKeyId }, 'API key deleted');
        return true;
    }

    return false;
}

/**
 * Verify API key has required permissions
 */
export async function verifyApiKeyPermissions(
    apiKeyId: string,
    userId: string,
    requiredPermissions: ApiKeyPermission[]
): Promise<boolean> {
    const apiKey = await getApiKeyById(apiKeyId, userId);

    if (!apiKey || !apiKey.isActive) {
        return false;
    }

    return requiredPermissions.every(perm => apiKey.permissions.includes(perm));
}

// ============================================
// HELPERS
// ============================================

/**
 * Mask API key for display
 */
function maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
        return '********';
    }
    return `${apiKey.slice(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}

/**
 * Test API key connectivity to exchange
 * (Placeholder - would actually call exchange API)
 */
export async function testApiKeyConnection(
    apiKeyId: string,
    userId: string
): Promise<{ success: boolean; balance?: Record<string, number>; error?: string }> {
    const credentials = await getDecryptedCredentials(apiKeyId, userId);

    if (!credentials) {
        return { success: false, error: 'API key not found or inactive' };
    }

    // TODO: Actually test connection to exchange
    // For now, return mock success
    log.info({ userId, exchange: credentials.exchange }, 'Testing API key connection');

    return {
        success: true,
        balance: {
            BTC: 0.0,
            USDT: 0.0,
        },
    };
}
