/**
 * Strategy Service
 * CRUD operations for trading strategies
 */

import { ObjectId } from 'mongodb';
import { getCollections } from './mongodb.js';
import { clearCachePattern, getCache, setCache } from './redis.js';
import { createLogger } from '../utils/logger.js';
import type { Strategy, PaginatedResult, StrategyStatus } from '../types/index.js';
import type { CreateStrategyInput, UpdateStrategyInput, PaginationInput } from '../types/schemas.js';

const log = createLogger('StrategyService');

// Strategy limits by subscription tier
const STRATEGY_LIMITS: Record<string, number> = {
    free: 2,
    starter: 10,
    pro: 50,
    enterprise: 500,
};

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new strategy
 */
export async function createStrategy(
    userId: string,
    subscription: string,
    input: CreateStrategyInput
): Promise<Strategy> {
    const { strategies } = getCollections();

    // Check strategy limit
    const userStrategies = await strategies.countDocuments({ userId });
    const limit = STRATEGY_LIMITS[subscription] || STRATEGY_LIMITS.free;

    if (userStrategies >= limit) {
        throw new Error(`Strategy limit reached (${limit}). Upgrade your subscription for more.`);
    }

    const now = new Date();
    const strategy: Omit<Strategy, '_id'> = {
        userId,
        name: input.name,
        description: input.description,
        type: input.type,
        status: 'draft',
        config: input.config,
        assetPairs: input.assetPairs,
        exchange: input.exchange,
        riskSettings: input.riskSettings || {
            maxPositionSize: 10,
            stopLossPercent: 2,
            takeProfitPercent: 4,
            maxDailyLoss: 10,
            maxConcurrentTrades: 5,
        },
        createdAt: now,
        updatedAt: now,
    };

    const result = await strategies.insertOne(strategy as Strategy);

    // Invalidate cache
    await clearCachePattern(`strategies:${userId}:*`);

    log.info({ userId, strategyId: result.insertedId.toString() }, 'Strategy created');

    return { ...strategy, _id: result.insertedId.toString() } as Strategy;
}

/**
 * Get strategy by ID
 */
export async function getStrategyById(strategyId: string, userId: string): Promise<Strategy | null> {
    // Try cache first
    const cacheKey = `strategy:${strategyId}`;
    const cached = await getCache<Strategy>(cacheKey);
    if (cached && cached.userId === userId) {
        return cached;
    }

    const { strategies } = getCollections();
    const strategy = await strategies.findOne({
        _id: new ObjectId(strategyId) as unknown as string,
        userId,
    });

    if (strategy) {
        await setCache(cacheKey, strategy, 300);
    }

    return strategy;
}

/**
 * Get all strategies for a user with pagination
 */
export async function getStrategies(
    userId: string,
    pagination: PaginationInput,
    status?: StrategyStatus
): Promise<PaginatedResult<Strategy>> {
    const { strategies } = getCollections();

    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = { userId };
    if (status) {
        query.status = status;
    }

    // Get total count
    const total = await strategies.countDocuments(query);

    // Get paginated results
    const items = await strategies
        .find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

    const totalPages = Math.ceil(total / limit);

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}

/**
 * Update a strategy
 */
export async function updateStrategy(
    strategyId: string,
    userId: string,
    input: UpdateStrategyInput
): Promise<Strategy | null> {
    const { strategies } = getCollections();

    // Verify ownership
    const existing = await strategies.findOne({
        _id: new ObjectId(strategyId) as unknown as string,
        userId,
    });

    if (!existing) {
        return null;
    }

    // Cannot update active strategies
    if (existing.status === 'active') {
        throw new Error('Cannot update an active strategy. Stop it first.');
    }

    const updateData: Partial<Strategy> = {
        ...input,
        updatedAt: new Date(),
    };

    const result = await strategies.findOneAndUpdate(
        { _id: new ObjectId(strategyId) as unknown as string, userId },
        { $set: updateData },
        { returnDocument: 'after' }
    );

    if (result) {
        await clearCachePattern(`strategy:${strategyId}`);
        await clearCachePattern(`strategies:${userId}:*`);
        log.info({ userId, strategyId }, 'Strategy updated');
    }

    return result;
}

/**
 * Delete a strategy
 */
export async function deleteStrategy(strategyId: string, userId: string): Promise<boolean> {
    const { strategies } = getCollections();

    // Verify ownership and status
    const existing = await strategies.findOne({
        _id: new ObjectId(strategyId) as unknown as string,
        userId,
    });

    if (!existing) {
        return false;
    }

    // Cannot delete active strategies
    if (existing.status === 'active') {
        throw new Error('Cannot delete an active strategy. Stop it first.');
    }

    const result = await strategies.deleteOne({
        _id: new ObjectId(strategyId) as unknown as string,
        userId,
    });

    if (result.deletedCount > 0) {
        await clearCachePattern(`strategy:${strategyId}`);
        await clearCachePattern(`strategies:${userId}:*`);
        log.info({ userId, strategyId }, 'Strategy deleted');
        return true;
    }

    return false;
}

// ============================================
// STRATEGY LIFECYCLE
// ============================================

/**
 * Update strategy status
 */
export async function updateStrategyStatus(
    strategyId: string,
    userId: string,
    status: StrategyStatus
): Promise<Strategy | null> {
    const { strategies } = getCollections();

    const result = await strategies.findOneAndUpdate(
        { _id: new ObjectId(strategyId) as unknown as string, userId },
        {
            $set: {
                status,
                updatedAt: new Date(),
            }
        },
        { returnDocument: 'after' }
    );

    if (result) {
        await clearCachePattern(`strategy:${strategyId}`);
        log.info({ userId, strategyId, status }, 'Strategy status updated');
    }

    return result;
}

/**
 * Deploy a strategy (start live trading)
 */
export async function deployStrategy(
    strategyId: string,
    userId: string,
    apiKeyId: string,
    dryRun: boolean = false
): Promise<Strategy | null> {
    // Verify strategy exists and is not already active
    const strategy = await getStrategyById(strategyId, userId);

    if (!strategy) {
        return null;
    }

    if (strategy.status === 'active') {
        throw new Error('Strategy is already active');
    }

    // TODO: Verify API key exists and has trade permissions
    // TODO: Send deployment message to trading service via RabbitMQ

    const newStatus: StrategyStatus = dryRun ? 'active' : 'active';

    return updateStrategyStatus(strategyId, userId, newStatus);
}

/**
 * Stop a strategy
 */
export async function stopStrategy(
    strategyId: string,
    userId: string
): Promise<Strategy | null> {
    const strategy = await getStrategyById(strategyId, userId);

    if (!strategy) {
        return null;
    }

    if (strategy.status !== 'active' && strategy.status !== 'paused') {
        throw new Error('Strategy is not running');
    }

    // TODO: Send stop message to trading service via RabbitMQ

    return updateStrategyStatus(strategyId, userId, 'stopped');
}

/**
 * Pause a strategy (temporarily stop without losing state)
 */
export async function pauseStrategy(
    strategyId: string,
    userId: string
): Promise<Strategy | null> {
    const strategy = await getStrategyById(strategyId, userId);

    if (!strategy) {
        return null;
    }

    if (strategy.status !== 'active') {
        throw new Error('Can only pause active strategies');
    }

    return updateStrategyStatus(strategyId, userId, 'paused');
}

/**
 * Resume a paused strategy
 */
export async function resumeStrategy(
    strategyId: string,
    userId: string
): Promise<Strategy | null> {
    const strategy = await getStrategyById(strategyId, userId);

    if (!strategy) {
        return null;
    }

    if (strategy.status !== 'paused') {
        throw new Error('Can only resume paused strategies');
    }

    return updateStrategyStatus(strategyId, userId, 'active');
}
