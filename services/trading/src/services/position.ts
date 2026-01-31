/**
 * Position Service
 * Position tracking and management
 */

import { MongoClient, Collection, ObjectId } from 'mongodb';
import Decimal from 'decimal.js';
import { createLogger } from '../utils/logger.js';
import { env } from '../utils/env.js';
import type {
    Position,
    PositionUpdate,
    Order,
    PositionSide,
} from '../types/index.js';

const log = createLogger('PositionService');

let client: MongoClient | null = null;
let positionsCollection: Collection<Position> | null = null;

// ============================================
// DATABASE CONNECTION
// ============================================

export async function initPositionService(): Promise<void> {
    if (client) return;

    client = new MongoClient(env.MONGODB_URI);
    await client.connect();

    const db = client.db();
    positionsCollection = db.collection<Position>('positions');

    // Create indexes
    await positionsCollection.createIndex({ userId: 1, status: 1 });
    await positionsCollection.createIndex({ strategyId: 1, status: 1 });
    await positionsCollection.createIndex({ symbol: 1, exchange: 1 });
    await positionsCollection.createIndex({ openedAt: -1 });

    log.info('Position service initialized');
}

export async function closePositionService(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        positionsCollection = null;
    }
}

function getCollection(): Collection<Position> {
    if (!positionsCollection) {
        throw new Error('Position service not initialized');
    }
    return positionsCollection;
}

// ============================================
// POSITION OPERATIONS
// ============================================

/**
 * Open a new position from a filled order
 */
export async function openPosition(
    order: Order
): Promise<Position> {
    const collection = getCollection();

    const side: PositionSide = order.side === 'buy' ? 'long' : 'short';
    const entryPrice = order.avgPrice ?? order.price ?? 0;
    const size = order.filled;

    const position: Omit<Position, 'id'> = {
        strategyId: order.strategyId,
        userId: order.userId,
        exchange: order.exchange,
        symbol: order.symbol,
        side,
        status: 'open',
        size,
        entryPrice,
        currentPrice: entryPrice,
        notionalValue: new Decimal(size).mul(entryPrice).toNumber(),
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        realizedPnl: 0,
        leverage: 1,
        orders: [order.id],
        openedAt: new Date(),
        updatedAt: new Date(),
    };

    const result = await collection.insertOne(position as Position);

    const created: Position = {
        ...position,
        id: result.insertedId.toString(),
    };

    log.info({
        positionId: created.id,
        symbol: created.symbol,
        side: created.side,
        size: created.size,
        entryPrice: created.entryPrice,
    }, 'Position opened');

    return created;
}

/**
 * Update position from additional orders (scaling in/out)
 */
export async function updatePositionFromOrder(
    positionId: string,
    order: Order
): Promise<Position | null> {
    const collection = getCollection();
    const position = await getPositionById(positionId);

    if (!position || position.status !== 'open') {
        return null;
    }

    const orderPrice = order.avgPrice ?? order.price ?? position.currentPrice;
    const isIncreasing =
        (position.side === 'long' && order.side === 'buy') ||
        (position.side === 'short' && order.side === 'sell');

    let newSize: number;
    let newEntryPrice: number;

    if (isIncreasing) {
        // Adding to position - calculate weighted average entry
        const totalCost = new Decimal(position.size).mul(position.entryPrice)
            .plus(new Decimal(order.filled).mul(orderPrice));
        newSize = new Decimal(position.size).plus(order.filled).toNumber();
        newEntryPrice = totalCost.div(newSize).toNumber();
    } else {
        // Reducing position
        newSize = new Decimal(position.size).minus(order.filled).toNumber();
        newEntryPrice = position.entryPrice;

        // Calculate realized P&L for the closed portion
        const pnlPerUnit = position.side === 'long'
            ? new Decimal(orderPrice).minus(position.entryPrice)
            : new Decimal(position.entryPrice).minus(orderPrice);

        const realizedPnl = pnlPerUnit.mul(order.filled).toNumber();

        await collection.updateOne(
            { _id: new ObjectId(positionId) },
            { $inc: { realizedPnl } }
        );
    }

    // Check if position is fully closed
    if (newSize <= 0) {
        return closePosition(positionId, orderPrice);
    }

    const updatedPosition = await collection.findOneAndUpdate(
        { _id: new ObjectId(positionId) },
        {
            $set: {
                size: newSize,
                entryPrice: newEntryPrice,
                notionalValue: new Decimal(newSize).mul(position.currentPrice).toNumber(),
                updatedAt: new Date(),
            },
            $push: { orders: order.id },
        },
        { returnDocument: 'after' }
    );

    if (updatedPosition) {
        log.info({
            positionId,
            newSize,
            newEntryPrice,
        }, 'Position updated from order');
    }

    return updatedPosition ? { ...updatedPosition, id: updatedPosition._id.toString() } : null;
}

/**
 * Update position with current price
 */
export async function updatePositionPrice(
    positionId: string,
    currentPrice: number
): Promise<Position | null> {
    const collection = getCollection();
    const position = await getPositionById(positionId);

    if (!position || position.status !== 'open') {
        return null;
    }

    // Calculate unrealized P&L
    const pnlPerUnit = position.side === 'long'
        ? new Decimal(currentPrice).minus(position.entryPrice)
        : new Decimal(position.entryPrice).minus(currentPrice);

    const unrealizedPnl = pnlPerUnit.mul(position.size).toNumber();
    const unrealizedPnlPercent = pnlPerUnit.div(position.entryPrice).mul(100).toNumber();
    const notionalValue = new Decimal(position.size).mul(currentPrice).toNumber();

    await collection.updateOne(
        { _id: new ObjectId(positionId) },
        {
            $set: {
                currentPrice,
                notionalValue,
                unrealizedPnl,
                unrealizedPnlPercent,
                updatedAt: new Date(),
            },
        }
    );

    return getPositionById(positionId);
}

/**
 * Close a position
 */
export async function closePosition(
    positionId: string,
    closePrice?: number
): Promise<Position | null> {
    const collection = getCollection();
    const position = await getPositionById(positionId);

    if (!position || position.status !== 'open') {
        return null;
    }

    const finalPrice = closePrice ?? position.currentPrice;

    // Calculate final realized P&L
    const pnlPerUnit = position.side === 'long'
        ? new Decimal(finalPrice).minus(position.entryPrice)
        : new Decimal(position.entryPrice).minus(finalPrice);

    const finalRealizedPnl = pnlPerUnit.mul(position.size).plus(position.realizedPnl).toNumber();

    await collection.updateOne(
        { _id: new ObjectId(positionId) },
        {
            $set: {
                status: 'closed',
                currentPrice: finalPrice,
                unrealizedPnl: 0,
                unrealizedPnlPercent: 0,
                realizedPnl: finalRealizedPnl,
                closedAt: new Date(),
                updatedAt: new Date(),
            },
        }
    );

    log.info({
        positionId,
        symbol: position.symbol,
        side: position.side,
        realizedPnl: finalRealizedPnl,
    }, 'Position closed');

    return getPositionById(positionId);
}

/**
 * Update position risk levels
 */
export async function updatePositionRiskLevels(
    positionId: string,
    update: PositionUpdate
): Promise<Position | null> {
    const collection = getCollection();

    const setFields: Partial<Position> = {
        updatedAt: new Date(),
    };

    if (update.stopLossPrice !== undefined) {
        setFields.stopLossPrice = update.stopLossPrice;
    }
    if (update.takeProfitPrice !== undefined) {
        setFields.takeProfitPrice = update.takeProfitPrice;
    }

    await collection.updateOne(
        { _id: new ObjectId(positionId) },
        { $set: setFields }
    );

    return getPositionById(positionId);
}

// ============================================
// QUERIES
// ============================================

/**
 * Get position by ID
 */
export async function getPositionById(positionId: string): Promise<Position | null> {
    const collection = getCollection();
    const position = await collection.findOne({ _id: new ObjectId(positionId) });

    if (!position) return null;

    return { ...position, id: position._id.toString() };
}

/**
 * Get open positions for a user
 */
export async function getOpenPositions(
    userId: string,
    strategyId?: string
): Promise<Position[]> {
    const collection = getCollection();

    const filter: Record<string, unknown> = {
        userId,
        status: 'open',
    };

    if (strategyId) {
        filter.strategyId = strategyId;
    }

    const positions = await collection.find(filter).toArray();
    return positions.map(p => ({ ...p, id: p._id.toString() }));
}

/**
 * Get position for a specific symbol/strategy
 */
export async function getPositionBySymbol(
    userId: string,
    strategyId: string,
    symbol: string
): Promise<Position | null> {
    const collection = getCollection();

    const position = await collection.findOne({
        userId,
        strategyId,
        symbol,
        status: 'open',
    });

    if (!position) return null;

    return { ...position, id: position._id.toString() };
}

/**
 * Get position statistics
 */
export async function getPositionStats(userId: string): Promise<{
    openPositions: number;
    totalUnrealizedPnl: number;
    totalRealizedPnl: number;
    largestPosition: number;
}> {
    const collection = getCollection();

    const stats = await collection.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                unrealizedPnl: { $sum: '$unrealizedPnl' },
                realizedPnl: { $sum: '$realizedPnl' },
                maxNotional: { $max: '$notionalValue' },
            },
        },
    ]).toArray();

    const openStats = stats.find(s => s._id === 'open');
    const closedStats = stats.find(s => s._id === 'closed');

    return {
        openPositions: openStats?.count ?? 0,
        totalUnrealizedPnl: openStats?.unrealizedPnl ?? 0,
        totalRealizedPnl: (openStats?.realizedPnl ?? 0) + (closedStats?.realizedPnl ?? 0),
        largestPosition: openStats?.maxNotional ?? 0,
    };
}

/**
 * Check for positions that need stop-loss or take-profit execution
 */
export async function getPositionsNeedingExecution(
    currentPrices: Map<string, number>
): Promise<Position[]> {
    const collection = getCollection();
    const needsExecution: Position[] = [];

    const openPositions = await collection.find({ status: 'open' }).toArray();

    for (const position of openPositions) {
        const currentPrice = currentPrices.get(position.symbol);
        if (!currentPrice) continue;

        // Check stop loss
        if (position.stopLossPrice) {
            const hitStopLoss = position.side === 'long'
                ? currentPrice <= position.stopLossPrice
                : currentPrice >= position.stopLossPrice;

            if (hitStopLoss) {
                needsExecution.push({ ...position, id: position._id.toString() });
                continue;
            }
        }

        // Check take profit
        if (position.takeProfitPrice) {
            const hitTakeProfit = position.side === 'long'
                ? currentPrice >= position.takeProfitPrice
                : currentPrice <= position.takeProfitPrice;

            if (hitTakeProfit) {
                needsExecution.push({ ...position, id: position._id.toString() });
            }
        }
    }

    return needsExecution;
}
