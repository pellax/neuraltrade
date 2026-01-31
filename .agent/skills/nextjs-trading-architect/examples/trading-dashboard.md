# Ejemplo: Dashboard de Trading Completo para NeuralTrade

Este ejemplo demuestra cómo Next.js Trading Architect construye un dashboard de trading profesional.

---

## 📋 Objetivo

Construir un dashboard de trading con:
1. Gráficas TradingView en tiempo real
2. Order book con WebSocket updates
3. Panel de órdenes con Server Actions
4. Portfolio overview con SSR
5. Optimización de performance

---

## 1. 🏠 Página Principal del Trading

```tsx
// app/(dashboard)/trading/page.tsx
import { Suspense } from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { TradingInterface } from '@/components/trading/TradingInterface';
import { MarketSidebar } from '@/components/trading/MarketSidebar';
import { OrderPanel } from '@/components/trading/OrderPanel';
import { 
  TradingChartSkeleton, 
  OrderBookSkeleton, 
  MarketSidebarSkeleton 
} from '@/components/skeletons';

import { getAvailablePairs, getUserPositions, getRecentSignals } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Trading',
  description: 'Real-time cryptocurrency trading with AI signals',
};

// Server Component - fetches initial data
export default async function TradingPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  
  // Parallel data fetching en servidor
  const [pairs, positions, signals] = await Promise.all([
    getAvailablePairs(),
    getUserPositions(session.user.id),
    getRecentSignals(session.user.id),
  ]);
  
  return (
    <div className="flex h-[calc(100vh-64px)] gap-4 p-4">
      {/* Left Sidebar: Markets */}
      <aside className="w-64 flex-shrink-0">
        <Suspense fallback={<MarketSidebarSkeleton />}>
          <MarketSidebar 
            pairs={pairs} 
            signals={signals}
          />
        </Suspense>
      </aside>
      
      {/* Main: Chart + Order Form */}
      <main className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Chart Container */}
        <div className="flex-1 min-h-[400px]">
          <Suspense fallback={<TradingChartSkeleton />}>
            <TradingInterface 
              defaultPair={pairs[0]?.symbol || 'BTC/USDT'}
              availablePairs={pairs}
            />
          </Suspense>
        </div>
        
        {/* Bottom: Positions Table */}
        <div className="h-48 flex-shrink-0">
          <Suspense fallback={<div className="animate-pulse h-full bg-muted rounded-lg" />}>
            <OpenPositions initialPositions={positions} />
          </Suspense>
        </div>
      </main>
      
      {/* Right Sidebar: Orders */}
      <aside className="w-80 flex-shrink-0">
        <Suspense fallback={<OrderBookSkeleton />}>
          <OrderPanel userId={session.user.id} />
        </Suspense>
      </aside>
    </div>
  );
}
```

---

## 2. 📊 Trading Interface (Client Component)

```tsx
// components/trading/TradingInterface.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { TradingChart } from '@/components/charts/TradingChart';
import { PairSelector } from './PairSelector';
import { TimeframeSelector } from './TimeframeSelector';
import { SignalIndicator } from './SignalIndicator';
import { PriceDisplay } from './PriceDisplay';
import { usePriceStream } from '@/hooks/usePriceStream';
import { useChartData } from '@/hooks/useChartData';

interface TradingInterfaceProps {
  defaultPair: string;
  availablePairs: Array<{ symbol: string; name: string }>;
}

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export function TradingInterface({ 
  defaultPair, 
  availablePairs 
}: TradingInterfaceProps) {
  const [selectedPair, setSelectedPair] = useState(defaultPair);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  
  // Fetch historical data for chart
  const { data: chartData, isLoading } = useChartData(selectedPair, timeframe);
  
  // Real-time price stream
  const { currentPrice, change24h, isConnected } = usePriceStream(selectedPair);
  
  // Memoize handlers
  const handlePairChange = useCallback((pair: string) => {
    setSelectedPair(pair);
  }, []);
  
  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setTimeframe(tf);
  }, []);
  
  const handleCrosshairMove = useCallback((price: number | null) => {
    setCrosshairPrice(price);
  }, []);
  
  // Display price (crosshair or current)
  const displayPrice = useMemo(() => 
    crosshairPrice ?? currentPrice,
    [crosshairPrice, currentPrice]
  );
  
  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          {/* Pair Selector */}
          <PairSelector
            pairs={availablePairs}
            selected={selectedPair}
            onChange={handlePairChange}
          />
          
          {/* Price Display */}
          <PriceDisplay
            price={displayPrice}
            change={change24h}
            isLive={!crosshairPrice}
          />
          
          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            <span 
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live' : 'Reconnecting...'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* AI Signal Indicator */}
          <SignalIndicator symbol={selectedPair} />
          
          {/* Timeframe Selector */}
          <TimeframeSelector
            selected={timeframe}
            onChange={handleTimeframeChange}
          />
        </div>
      </div>
      
      {/* Chart */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <TradingChart
            symbol={selectedPair}
            initialData={chartData}
            onCrosshairMove={handleCrosshairMove}
          />
        )}
      </div>
    </div>
  );
}
```

---

## 3. 📖 Order Book en Tiempo Real

```tsx
// components/trading/OrderBook.tsx
'use client';

import { useMemo, memo } from 'react';
import { useWebSocketChannel } from '@/hooks/useWebSocket';
import { formatPrice, formatQuantity } from '@/lib/format';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
}

interface OrderBookProps {
  symbol: string;
  depth?: number;
}

export const OrderBook = memo(function OrderBook({ 
  symbol, 
  depth = 15 
}: OrderBookProps) {
  // WebSocket para order book updates
  const { data: orderBookData, isConnected } = useWebSocketChannel<OrderBookData>(
    `orderbook:${symbol}`
  );
  
  // Calcular max total para barras de profundidad
  const maxTotal = useMemo(() => {
    if (!orderBookData) return 0;
    const allTotals = [
      ...orderBookData.bids.map(b => b.total),
      ...orderBookData.asks.map(a => a.total),
    ];
    return Math.max(...allTotals);
  }, [orderBookData]);
  
  if (!orderBookData) {
    return <OrderBookSkeleton depth={depth} />;
  }
  
  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="text-sm font-medium">Order Book</h3>
        <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          {isConnected ? '● Live' : '○ Offline'}
        </span>
      </div>
      
      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-4 py-1.5 text-xs text-muted-foreground border-b border-border">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>
      
      {/* Asks (Sells) - reversed for visual */}
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col-reverse">
          {orderBookData.asks.slice(0, depth).map((ask, i) => (
            <OrderRow
              key={`ask-${i}`}
              price={ask.price}
              quantity={ask.quantity}
              total={ask.total}
              maxTotal={maxTotal}
              side="ask"
            />
          ))}
        </div>
      </div>
      
      {/* Spread */}
      <div className="flex items-center justify-center py-2 border-y border-border bg-muted/50">
        <span className="text-sm font-mono">
          Spread: {formatPrice(orderBookData.spread)} ({orderBookData.spreadPercent.toFixed(2)}%)
        </span>
      </div>
      
      {/* Bids (Buys) */}
      <div className="flex-1 overflow-hidden">
        {orderBookData.bids.slice(0, depth).map((bid, i) => (
          <OrderRow
            key={`bid-${i}`}
            price={bid.price}
            quantity={bid.quantity}
            total={bid.total}
            maxTotal={maxTotal}
            side="bid"
          />
        ))}
      </div>
    </div>
  );
});

// Memoized row component para evitar re-renders innecesarios
const OrderRow = memo(function OrderRow({
  price,
  quantity,
  total,
  maxTotal,
  side,
}: {
  price: number;
  quantity: number;
  total: number;
  maxTotal: number;
  side: 'bid' | 'ask';
}) {
  const depthPercent = (total / maxTotal) * 100;
  const bgColor = side === 'bid' ? 'bg-green-500/10' : 'bg-red-500/10';
  const textColor = side === 'bid' ? 'text-green-500' : 'text-red-500';
  
  return (
    <div className="relative grid grid-cols-3 gap-2 px-4 py-1 text-xs font-mono hover:bg-muted/50 cursor-pointer">
      {/* Depth bar background */}
      <div 
        className={`absolute inset-y-0 right-0 ${bgColor}`}
        style={{ width: `${depthPercent}%` }}
      />
      
      {/* Content */}
      <span className={`relative ${textColor}`}>
        {formatPrice(price)}
      </span>
      <span className="relative text-right text-foreground">
        {formatQuantity(quantity)}
      </span>
      <span className="relative text-right text-muted-foreground">
        {formatQuantity(total)}
      </span>
    </div>
  );
});

function OrderBookSkeleton({ depth }: { depth: number }) {
  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      <div className="px-4 py-2 border-b border-border">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
      <div className="flex-1 p-4 space-y-1">
        {Array.from({ length: depth * 2 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
```

---

## 4. 📝 Order Form con Server Actions

```tsx
// components/trading/OrderForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createOrder } from '@/app/(dashboard)/trading/actions';
import { usePriceStream } from '@/hooks/usePriceStream';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';

const OrderSchema = z.object({
  symbol: z.string(),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive().optional(),
}).refine(
  data => data.type === 'market' || data.price !== undefined,
  { message: 'Price is required for limit/stop orders', path: ['price'] }
);

type OrderFormData = z.infer<typeof OrderSchema>;

interface OrderFormProps {
  symbol: string;
}

export function OrderForm({ symbol }: OrderFormProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('limit');
  const [isPending, startTransition] = useTransition();
  
  const { currentPrice } = usePriceStream(symbol);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<OrderFormData>({
    resolver: zodResolver(OrderSchema),
    defaultValues: {
      symbol,
      side,
      type: orderType,
      quantity: 0,
      price: currentPrice || undefined,
    },
  });
  
  const quantity = watch('quantity');
  const price = watch('price');
  
  // Calcular total
  const total = (quantity || 0) * (price || currentPrice || 0);
  
  // Handle submit con Server Action
  const onSubmit = (data: OrderFormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, String(value));
          }
        });
        
        await createOrder(formData);
        
        toast({
          title: 'Order Created',
          description: `${data.side.toUpperCase()} ${data.quantity} ${symbol}`,
          variant: 'success',
        });
        
        reset();
      } catch (error) {
        toast({
          title: 'Order Failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    });
  };
  
  // Quick fill buttons
  const handleQuickFill = (percent: number) => {
    // Calcular cantidad basada en balance disponible
    const maxQuantity = 1.0; // TODO: Get from balance
    setValue('quantity', maxQuantity * (percent / 100));
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Buy/Sell Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={side === 'buy' ? 'default' : 'outline'}
          className={side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
          onClick={() => {
            setSide('buy');
            setValue('side', 'buy');
          }}
        >
          Buy
        </Button>
        <Button
          type="button"
          variant={side === 'sell' ? 'default' : 'outline'}
          className={side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
          onClick={() => {
            setSide('sell');
            setValue('side', 'sell');
          }}
        >
          Sell
        </Button>
      </div>
      
      {/* Order Type */}
      <div className="flex gap-2">
        {(['limit', 'market', 'stop'] as const).map((type) => (
          <button
            key={type}
            type="button"
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              orderType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => {
              setOrderType(type);
              setValue('type', type);
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Price (for limit/stop) */}
      {orderType !== 'market' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Price
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('price', { valueAsNumber: true })}
            className={errors.price ? 'border-red-500' : ''}
          />
          {errors.price && (
            <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>
          )}
        </div>
      )}
      
      {/* Quantity */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Amount
        </label>
        <Input
          type="number"
          step="0.0001"
          placeholder="0.0000"
          {...register('quantity', { valueAsNumber: true })}
          className={errors.quantity ? 'border-red-500' : ''}
        />
        {errors.quantity && (
          <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>
        )}
        
        {/* Quick fill buttons */}
        <div className="flex gap-2 mt-2">
          {[25, 50, 75, 100].map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => handleQuickFill(percent)}
              className="flex-1 py-1 text-xs bg-muted rounded hover:bg-muted/80"
            >
              {percent}%
            </button>
          ))}
        </div>
      </div>
      
      {/* Total */}
      <div className="flex justify-between py-2 border-t border-border">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-sm font-medium">
          {total.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}
        </span>
      </div>
      
      {/* Submit Button */}
      <Button
        type="submit"
        className={`w-full ${
          side === 'buy' 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-red-600 hover:bg-red-700'
        }`}
        disabled={isPending}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : (
          `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol.split('/')[0]}`
        )}
      </Button>
      
      {/* Hidden inputs */}
      <input type="hidden" {...register('symbol')} value={symbol} />
    </form>
  );
}
```

---

## 5. 🔄 Custom Hooks

```typescript
// hooks/useChartData.ts
'use client';

import useSWR from 'swr';
import { CandlestickData } from 'lightweight-charts';

const fetcher = async (url: string): Promise<CandlestickData[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  
  const data = await res.json();
  
  // Transform to TradingView format
  return data.map((candle: any) => ({
    time: candle.timestamp as any,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
};

export function useChartData(symbol: string, timeframe: string) {
  const { data, error, isLoading, mutate } = useSWR<CandlestickData[]>(
    symbol ? `/api/market/${symbol}/candles?timeframe=${timeframe}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
    }
  );
  
  return {
    data: data || [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}


// hooks/useTrading.ts
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface TradingStore {
  selectedSymbol: string;
  positions: Position[];
  isLoading: boolean;
  
  // Actions
  setSelectedSymbol: (symbol: string) => void;
  updatePosition: (id: string, currentPrice: number) => void;
  addPosition: (position: Position) => void;
  removePosition: (id: string) => void;
}

export const useTradingStore = create<TradingStore>()(
  immer((set) => ({
    selectedSymbol: 'BTC/USDT',
    positions: [],
    isLoading: false,
    
    setSelectedSymbol: (symbol) =>
      set((state) => {
        state.selectedSymbol = symbol;
      }),
    
    updatePosition: (id, currentPrice) =>
      set((state) => {
        const position = state.positions.find((p) => p.id === id);
        if (position) {
          position.currentPrice = currentPrice;
          const pnl = (currentPrice - position.entryPrice) * position.quantity;
          position.unrealizedPnL = position.side === 'long' ? pnl : -pnl;
          position.unrealizedPnLPercent = 
            (position.unrealizedPnL / (position.entryPrice * position.quantity)) * 100;
        }
      }),
    
    addPosition: (position) =>
      set((state) => {
        state.positions.push(position);
      }),
    
    removePosition: (id) =>
      set((state) => {
        state.positions = state.positions.filter((p) => p.id !== id);
      }),
  }))
);
```

---

## 6. 🎨 Estilos y Animaciones

```css
/* styles/trading.css */

/* Smooth price updates */
.price-update {
  transition: color 0.15s ease-out;
}

.price-up {
  animation: flash-green 0.3s ease-out;
}

.price-down {
  animation: flash-red 0.3s ease-out;
}

@keyframes flash-green {
  0% { background-color: rgba(34, 197, 94, 0.4); }
  100% { background-color: transparent; }
}

@keyframes flash-red {
  0% { background-color: rgba(239, 68, 68, 0.4); }
  100% { background-color: transparent; }
}

/* Order book depth visualization */
.depth-bar {
  transition: width 0.1s ease-out;
}

/* Chart container - prevent layout shift */
.chart-container {
  contain: layout style paint;
  aspect-ratio: 16/9;
  min-height: 400px;
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--muted) 0%,
    var(--muted-foreground)/10 50%,
    var(--muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## ✅ Checklist de Implementación

```yaml
Arquitectura:
  ✅ App Router con route groups
  ✅ Server Components para data fetching
  ✅ Client Components para interactividad
  ✅ Loading states para todas las páginas

Real-Time:
  ✅ WebSocket singleton manager
  ✅ Price stream hook
  ✅ Order book updates
  ✅ Connection status indicator

Charts:
  ✅ Lightweight Charts integration
  ✅ Real-time candle updates
  ✅ Responsive resize
  ✅ Crosshair price display

Orders:
  ✅ Server Actions para crear órdenes
  ✅ Form validation con Zod
  ✅ Optimistic updates
  ✅ Error handling

Performance:
  ✅ Memoized components
  ✅ Suspense boundaries
  ✅ No layout shift
  ✅ Efficient re-renders
```

---

*Este ejemplo demuestra la arquitectura completa de un dashboard de trading profesional con Next.js 14.*
