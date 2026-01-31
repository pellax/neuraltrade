# Ejemplo: Refactorización de Tipos para NeuralTrade

Este ejemplo demuestra cómo TypeScript Craftsman refactoriza y mejora los tipos del proyecto NeuralTrade.

---

## 📋 Código Original (Débil)

```typescript
// services/backtesting/src/types.ts (ANTES)

interface Trade {
  id: string;
  symbol: string;
  side: string;
  entry: number;
  exit: number;
  qty: number;
  pnl: number;
  time: number;
}

function calculateMetrics(trades: any[]) {
  let wins = 0;
  let losses = 0;
  let totalPnl = 0;
  
  for (let i = 0; i < trades.length; i++) {
    if (trades[i].pnl > 0) {
      wins++;
    } else {
      losses++;
    }
    totalPnl += trades[i].pnl;
  }
  
  return {
    winRate: wins / trades.length,
    totalPnl: totalPnl,
    avgPnl: totalPnl / trades.length
  };
}
```

### Problemas Identificados

1. ❌ `side: string` - No es tipado estricto
2. ❌ `time: number` - ¿Es timestamp? ¿Segundos o milisegundos?
3. ❌ `trades: any[]` - Pierde toda seguridad de tipos
4. ❌ No hay validación de entrada
5. ❌ No hay manejo de casos edge (trades vacío, división por cero)
6. ❌ No hay documentación

---

## ✅ Código Refactorizado (Type-Safe)

### 1. Tipos Base con Branded Types

```typescript
// packages/shared-types/src/branded.ts

/**
 * Utilidad para crear Branded Types (Nominal Typing)
 * Evita confundir tipos que son estructuralmente iguales
 */
declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * Constructor genérico de branded types
 */
export function createBrandedType<T, B extends string>(
  brand: B,
  validator?: (value: T) => boolean,
) {
  return {
    create(value: T): Brand<T, B> {
      if (validator && !validator(value)) {
        throw new Error(`Invalid ${brand}: ${value}`);
      }
      return value as Brand<T, B>;
    },
    is(value: unknown): value is Brand<T, B> {
      return typeof value === typeof ('' as T) && (!validator || validator(value as T));
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// IDs DEL DOMINIO
// ═══════════════════════════════════════════════════════════════

export type TradeId = Brand<string, 'TradeId'>;
export type StrategyId = Brand<string, 'StrategyId'>;
export type UserId = Brand<string, 'UserId'>;
export type OrderId = Brand<string, 'OrderId'>;

export const TradeId = createBrandedType<string, 'TradeId'>(
  'TradeId',
  (v) => v.length > 0,
);

export const StrategyId = createBrandedType<string, 'StrategyId'>(
  'StrategyId',
  (v) => v.length > 0,
);

// ═══════════════════════════════════════════════════════════════
// VALUE OBJECTS
// ═══════════════════════════════════════════════════════════════

/**
 * Timestamp en milisegundos - autodocumenta la unidad
 */
export type Timestamp = Brand<number, 'Timestamp'>;

export const Timestamp = {
  now: (): Timestamp => Date.now() as Timestamp,
  fromDate: (date: Date): Timestamp => date.getTime() as Timestamp,
  toDate: (ts: Timestamp): Date => new Date(ts),
};

/**
 * Precio positivo - garantizado en el tipo
 */
export type PositiveNumber = Brand<number, 'PositiveNumber'>;

export const PositiveNumber = createBrandedType<number, 'PositiveNumber'>(
  'PositiveNumber',
  (v) => v > 0 && Number.isFinite(v),
);

/**
 * Porcentaje (0-100 o 0-1 según contexto)
 */
export type Percentage = Brand<number, 'Percentage'>;

export const Percentage = {
  fromRatio: (ratio: number): Percentage => (ratio * 100) as Percentage,
  toRatio: (pct: Percentage): number => pct / 100,
};
```

### 2. Tipos de Trade Mejorados

```typescript
// packages/shared-types/src/trade.types.ts

import { z } from 'zod';
import type { TradeId, StrategyId, Timestamp, PositiveNumber } from './branded';
import type { Exchange, Symbol } from './market.types';

/**
 * Lado del trade - union literal sin posibilidad de valores inválidos
 */
export type TradeSide = 'long' | 'short';

/**
 * Estado del trade siguiendo su ciclo de vida
 */
export type TradeStatus = 
  | 'pending'    // Señal generada, no ejecutada
  | 'open'       // Posición abierta
  | 'closed'     // Posición cerrada
  | 'cancelled'; // Cancelada antes de ejecución

/**
 * Trade ejecutado con todos sus datos inmutables
 * 
 * @remarks
 * Los campos son readonly para garantizar inmutabilidad.
 * Los cálculos derivados (pnl, duration) son getters.
 */
export interface ExecutedTrade {
  readonly id: TradeId;
  readonly strategyId: StrategyId;
  readonly exchange: Exchange;
  readonly symbol: Symbol;
  readonly side: TradeSide;
  readonly status: TradeStatus;
  
  // Entry
  readonly entryPrice: PositiveNumber;
  readonly entryQuantity: PositiveNumber;
  readonly entryTime: Timestamp;
  readonly entryFee: number;
  
  // Exit (undefined si aún abierto)
  readonly exitPrice?: PositiveNumber;
  readonly exitQuantity?: PositiveNumber;
  readonly exitTime?: Timestamp;
  readonly exitFee?: number;
  
  // Metadata
  readonly signalConfidence: number;
  readonly notes?: string;
}

/**
 * Trade cerrado - garantiza que tiene datos de salida
 */
export interface ClosedTrade extends ExecutedTrade {
  readonly status: 'closed';
  readonly exitPrice: PositiveNumber;
  readonly exitQuantity: PositiveNumber;
  readonly exitTime: Timestamp;
  readonly exitFee: number;
}

/**
 * Type guard: verifica si un trade está cerrado
 */
export function isClosedTrade(trade: ExecutedTrade): trade is ClosedTrade {
  return (
    trade.status === 'closed' &&
    trade.exitPrice !== undefined &&
    trade.exitTime !== undefined
  );
}

/**
 * Calcula el P&L de un trade cerrado
 * 
 * @param trade - Trade cerrado
 * @returns P&L neto (después de fees)
 */
export function calculateTradePnL(trade: ClosedTrade): number {
  const direction = trade.side === 'long' ? 1 : -1;
  const grossPnL = (trade.exitPrice - trade.entryPrice) * trade.entryQuantity * direction;
  const totalFees = trade.entryFee + trade.exitFee;
  return grossPnL - totalFees;
}

/**
 * Calcula la duración del trade en milisegundos
 */
export function calculateTradeDuration(trade: ClosedTrade): number {
  return trade.exitTime - trade.entryTime;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA ZOD PARA VALIDACIÓN RUNTIME
// ═══════════════════════════════════════════════════════════════

export const ExecutedTradeSchema = z.object({
  id: z.string().min(1),
  strategyId: z.string().min(1),
  exchange: z.enum(['binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin']),
  symbol: z.string().regex(/^[A-Z]+\/[A-Z]+$/),
  side: z.enum(['long', 'short']),
  status: z.enum(['pending', 'open', 'closed', 'cancelled']),
  entryPrice: z.number().positive(),
  entryQuantity: z.number().positive(),
  entryTime: z.number().int().positive(),
  entryFee: z.number().nonnegative(),
  exitPrice: z.number().positive().optional(),
  exitQuantity: z.number().positive().optional(),
  exitTime: z.number().int().positive().optional(),
  exitFee: z.number().nonnegative().optional(),
  signalConfidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type ValidatedTrade = z.infer<typeof ExecutedTradeSchema>;
```

### 3. Métricas con Result Type

```typescript
// services/backtesting/src/metrics/performance.ts

import type { ClosedTrade } from '@neuraltrade/shared-types';
import { isClosedTrade, calculateTradePnL } from '@neuraltrade/shared-types';

// ═══════════════════════════════════════════════════════════════
// RESULT TYPE
// ═══════════════════════════════════════════════════════════════

type Result<T, E extends Error = Error> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

const Result = {
  ok: <T>(value: T): Result<T, never> => ({ ok: true, value }),
  fail: <E extends Error>(error: E): Result<never, E> => ({ ok: false, error }),
} as const;

// ═══════════════════════════════════════════════════════════════
// ERRORES ESPECÍFICOS
// ═══════════════════════════════════════════════════════════════

export class InsufficientDataError extends Error {
  readonly name = 'InsufficientDataError';
  constructor(
    public readonly required: number,
    public readonly actual: number,
  ) {
    super(`Insufficient data: need ${required} trades, got ${actual}`);
  }
}

export class InvalidTradeError extends Error {
  readonly name = 'InvalidTradeError';
  constructor(
    public readonly tradeId: string,
    public readonly reason: string,
  ) {
    super(`Invalid trade ${tradeId}: ${reason}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// TIPOS DE MÉTRICAS
// ═══════════════════════════════════════════════════════════════

/**
 * Métricas de rendimiento calculadas
 * Todos los campos son readonly para inmutabilidad
 */
export interface PerformanceMetrics {
  // Básicas
  readonly totalTrades: number;
  readonly winningTrades: number;
  readonly losingTrades: number;
  readonly breakEvenTrades: number;
  
  // P&L
  readonly totalPnL: number;
  readonly grossProfit: number;
  readonly grossLoss: number;
  readonly averagePnL: number;
  readonly averageWin: number;
  readonly averageLoss: number;
  
  // Ratios
  readonly winRate: number;
  readonly profitFactor: number;
  readonly payoffRatio: number;
  readonly expectancy: number;
  
  // Riesgo
  readonly maxDrawdown: number;
  readonly maxDrawdownPercentage: number;
  readonly sharpeRatio: number | null;
  readonly sortinoRatio: number | null;
  readonly calmarRatio: number | null;
  
  // Duración
  readonly averageTradeDuration: number;
  readonly averageWinDuration: number;
  readonly averageLossDuration: number;
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DE MÉTRICAS
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula métricas de rendimiento completas para un conjunto de trades.
 * 
 * @param trades - Array de trades ejecutados (pueden estar abiertos o cerrados)
 * @param riskFreeRate - Tasa libre de riesgo anualizada (default: 2%)
 * @returns Result con métricas o error si hay datos insuficientes
 * 
 * @example
 * ```typescript
 * const result = calculatePerformanceMetrics(trades);
 * 
 * if (result.ok) {
 *   console.log(`Win Rate: ${(result.value.winRate * 100).toFixed(1)}%`);
 *   console.log(`Sharpe Ratio: ${result.value.sharpeRatio?.toFixed(2) ?? 'N/A'}`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function calculatePerformanceMetrics(
  trades: readonly ExecutedTrade[],
  riskFreeRate = 0.02,
): Result<PerformanceMetrics, InsufficientDataError> {
  // Filtrar solo trades cerrados
  const closedTrades = trades.filter(isClosedTrade);
  
  if (closedTrades.length === 0) {
    return Result.fail(new InsufficientDataError(1, 0));
  }

  // Calcular P&L de cada trade
  const pnlValues = closedTrades.map(calculateTradePnL);
  
  // Separar wins y losses
  const wins = pnlValues.filter(pnl => pnl > 0);
  const losses = pnlValues.filter(pnl => pnl < 0);
  const breakEven = pnlValues.filter(pnl => pnl === 0);

  // Métricas básicas
  const totalPnL = sum(pnlValues);
  const grossProfit = sum(wins);
  const grossLoss = Math.abs(sum(losses));

  // Calcular métricas
  const metrics: PerformanceMetrics = {
    // Básicas
    totalTrades: closedTrades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakEvenTrades: breakEven.length,

    // P&L
    totalPnL,
    grossProfit,
    grossLoss,
    averagePnL: totalPnL / closedTrades.length,
    averageWin: wins.length > 0 ? average(wins) : 0,
    averageLoss: losses.length > 0 ? Math.abs(average(losses)) : 0,

    // Ratios
    winRate: wins.length / closedTrades.length,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : Infinity,
    payoffRatio: calculatePayoffRatio(wins, losses),
    expectancy: calculateExpectancy(wins, losses, closedTrades.length),

    // Riesgo
    ...calculateDrawdownMetrics(pnlValues),
    sharpeRatio: calculateSharpeRatio(pnlValues, riskFreeRate),
    sortinoRatio: calculateSortinoRatio(pnlValues, riskFreeRate),
    calmarRatio: calculateCalmarRatio(pnlValues),

    // Duración
    ...calculateDurationMetrics(closedTrades),
  };

  return Result.ok(metrics);
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES (PURE FUNCTIONS)
// ═══════════════════════════════════════════════════════════════

function sum(values: readonly number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

function average(values: readonly number[]): number {
  return values.length > 0 ? sum(values) / values.length : 0;
}

function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const squaredDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(sum(squaredDiffs) / (values.length - 1));
}

function downsideDeviation(values: readonly number[], threshold = 0): number {
  const downsides = values.filter(v => v < threshold).map(v => (v - threshold) ** 2);
  if (downsides.length === 0) return 0;
  return Math.sqrt(sum(downsides) / values.length);
}

function calculatePayoffRatio(
  wins: readonly number[],
  losses: readonly number[],
): number {
  const avgWin = wins.length > 0 ? average(wins) : 0;
  const avgLoss = losses.length > 0 ? Math.abs(average(losses)) : 0;
  return avgLoss > 0 ? avgWin / avgLoss : Infinity;
}

function calculateExpectancy(
  wins: readonly number[],
  losses: readonly number[],
  totalTrades: number,
): number {
  const winRate = wins.length / totalTrades;
  const lossRate = losses.length / totalTrades;
  const avgWin = wins.length > 0 ? average(wins) : 0;
  const avgLoss = losses.length > 0 ? Math.abs(average(losses)) : 0;
  return (winRate * avgWin) - (lossRate * avgLoss);
}

function calculateSharpeRatio(
  pnlValues: readonly number[],
  riskFreeRate: number,
  annualizationFactor = 252,
): number | null {
  if (pnlValues.length < 2) return null;
  
  const mean = average(pnlValues);
  const std = standardDeviation(pnlValues);
  
  if (std === 0) return null;
  
  const dailyRiskFree = riskFreeRate / annualizationFactor;
  const excessReturn = mean - dailyRiskFree;
  
  return (excessReturn / std) * Math.sqrt(annualizationFactor);
}

function calculateSortinoRatio(
  pnlValues: readonly number[],
  riskFreeRate: number,
  annualizationFactor = 252,
): number | null {
  if (pnlValues.length < 2) return null;
  
  const mean = average(pnlValues);
  const downDev = downsideDeviation(pnlValues);
  
  if (downDev === 0) return null;
  
  const dailyRiskFree = riskFreeRate / annualizationFactor;
  const excessReturn = mean - dailyRiskFree;
  
  return (excessReturn / downDev) * Math.sqrt(annualizationFactor);
}

function calculateDrawdownMetrics(pnlValues: readonly number[]): {
  maxDrawdown: number;
  maxDrawdownPercentage: number;
} {
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  for (const pnl of pnlValues) {
    cumulative += pnl;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const maxDrawdownPercentage = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

  return { maxDrawdown, maxDrawdownPercentage };
}

function calculateCalmarRatio(pnlValues: readonly number[]): number | null {
  const { maxDrawdown } = calculateDrawdownMetrics(pnlValues);
  if (maxDrawdown === 0) return null;
  
  const totalReturn = sum(pnlValues);
  return totalReturn / maxDrawdown;
}

function calculateDurationMetrics(trades: readonly ClosedTrade[]): {
  averageTradeDuration: number;
  averageWinDuration: number;
  averageLossDuration: number;
} {
  const durations = trades.map(t => t.exitTime - t.entryTime);
  
  const winDurations = trades
    .filter(t => calculateTradePnL(t) > 0)
    .map(t => t.exitTime - t.entryTime);
  
  const lossDurations = trades
    .filter(t => calculateTradePnL(t) < 0)
    .map(t => t.exitTime - t.entryTime);

  return {
    averageTradeDuration: average(durations),
    averageWinDuration: average(winDurations),
    averageLossDuration: average(lossDurations),
  };
}
```

---

## 🎯 Beneficios de la Refactorización

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Type Safety** | `any[]` - sin validación | Tipos estrictos + type guards |
| **Errores** | Silenciosos (NaN, undefined) | Result type con errores explícitos |
| **Documentación** | Ninguna | JSDoc completo con ejemplos |
| **Testabilidad** | Difícil de mockear | Pure functions, fácil de testear |
| **Mantenibilidad** | Código frágil | Código autodocumentado |
| **Refactoring** | Peligroso | Seguro (TypeScript te guía) |

---

*Este ejemplo demuestra la transformación de código JavaScript débil a TypeScript idiomático y type-safe.*
