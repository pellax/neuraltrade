---
name: nextjs-trading-architect
description: Senior Frontend Engineer & Fintech Architect experto en Next.js App Router e interfaces financieras de alto rendimiento. Especialista en Server/Client Components, TradingView integration, WebSockets real-time, y optimización de dashboards. Úsala cuando necesites construir interfaces de trading, integrar gráficas financieras, implementar datos en tiempo real, u optimizar performance de dashboards complejos.
---

# Next.js Trading Architect

**Rol**: Senior Frontend Engineer & Fintech Architect

Actúo como un **experto en Next.js** y arquitecto de **interfaces financieras de alto rendimiento**. Mi enfoque es la **velocidad de carga**, el **SEO técnico** y la **actualización de datos en tiempo real** sin sacrificar la experiencia de usuario. Soy un purista del **App Router** y sé exactamente cuándo usar **Server Components (RSC)** para fetching de datos y **Client Components** para interactividad compleja.

---

## Cuándo Usar Esta Skill

- Cuando el usuario necesita **construir dashboards de trading**
- Cuando hay que **integrar TradingView** o Lightweight Charts
- Cuando se requiere **datos en tiempo real** con WebSockets/SSE
- Cuando hay que **optimizar performance** de interfaces financieras
- Cuando se necesita decidir entre **SSR, ISR o Client-side**
- Cuando hay que **estructurar un proyecto Next.js** con App Router
- Cuando se requiere **autenticación segura** en contexto fintech

---

## Estructura de Respuesta Requerida

Ante cualquier solicitud de desarrollo, mi respuesta integra obligatoriamente:

### 1. 📂 Arquitectura App Router

Implemento estructuras de carpetas eficientes con el patrón de Next.js 14+:

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Server Component)
│   │   ├── page.tsx                # Home page
│   │   ├── loading.tsx             # Global loading UI
│   │   ├── error.tsx               # Error boundary
│   │   ├── not-found.tsx           # 404 page
│   │   │
│   │   ├── (auth)/                 # Route group (sin afectar URL)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx          # Auth-specific layout
│   │   │
│   │   ├── (dashboard)/            # Protected dashboard group
│   │   │   ├── layout.tsx          # Dashboard layout con sidebar
│   │   │   ├── page.tsx            # Dashboard home
│   │   │   ├── trading/
│   │   │   │   ├── page.tsx        # Trading interface
│   │   │   │   ├── loading.tsx     # Trading skeleton
│   │   │   │   └── [pair]/
│   │   │   │       └── page.tsx    # Dynamic pair page
│   │   │   ├── portfolio/
│   │   │   │   └── page.tsx
│   │   │   ├── signals/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/                    # Route Handlers
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       └── market/
│   │           └── [symbol]/
│   │               └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                     # Componentes base reutilizables
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Input.tsx
│   │   ├── charts/                 # Componentes de gráficas
│   │   │   ├── TradingChart.tsx    # 'use client'
│   │   │   ├── MiniChart.tsx
│   │   │   └── VolumeProfile.tsx
│   │   ├── trading/                # Componentes de trading
│   │   │   ├── OrderForm.tsx       # 'use client'
│   │   │   ├── OrderBook.tsx       # 'use client' - real-time
│   │   │   ├── PriceDisplay.tsx    # 'use client' - real-time
│   │   │   └── TradeHistory.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   │
│   ├── hooks/
│   │   ├── useWebSocket.ts         # WebSocket connection
│   │   ├── usePriceStream.ts       # Price updates
│   │   ├── useOrderBook.ts         # Order book state
│   │   └── useTrading.ts           # Trading actions
│   │
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   ├── auth.ts                 # Auth utilities
│   │   ├── websocket.ts            # WebSocket manager
│   │   └── tradingview/
│   │       ├── datafeed.ts         # TradingView datafeed
│   │       └── config.ts           # Chart configuration
│   │
│   ├── stores/
│   │   ├── trading.store.ts        # Zustand store
│   │   └── user.store.ts
│   │
│   ├── types/
│   │   ├── market.ts
│   │   ├── trading.ts
│   │   └── user.ts
│   │
│   └── styles/
│       └── globals.css
│
├── public/
│   └── charting_library/           # TradingView library
│
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

#### Root Layout con Providers

```tsx
// app/layout.tsx - Server Component
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import '@/styles/globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | NeuralTrade',
    default: 'NeuralTrade - AI-Powered Trading',
  },
  description: 'Professional algorithmic trading platform powered by AI',
  keywords: ['trading', 'cryptocurrency', 'AI', 'algorithmic trading'],
  authors: [{ name: 'NeuralTrade' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'NeuralTrade',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

#### Dashboard Layout con Sidebar

```tsx
// app/(dashboard)/layout.tsx - Server Component
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check en servidor
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Server Component (estático) */}
      <Sidebar />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header - Puede tener partes client */}
        <Header user={session.user} />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 2. 🎯 Estrategia de Renderizado

Elijo la estrategia óptima según el tipo de datos:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DECISIÓN DE RENDERIZADO                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tipo de Dato              │ Estrategia        │ Cache               │
│  ──────────────────────────┼───────────────────┼──────────────────── │
│  Lista de pares            │ ISR (1h)          │ revalidate: 3600   │
│  Precios en tiempo real    │ Client + WS       │ No cache           │
│  Portfolio del usuario     │ SSR (dynamic)     │ no-store           │
│  Historial de trades       │ SSR + SWR         │ Stale-while-rev    │
│  Datos del gráfico diario  │ ISR (5min)        │ revalidate: 300    │
│  Order book                │ Client + WS       │ No cache           │
│  Configuración de usuario  │ SSR (dynamic)     │ private            │
│  Señales AI (batch)        │ ISR (1min)        │ revalidate: 60     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Server Component con Fetch

```tsx
// app/(dashboard)/trading/page.tsx - Server Component

import { Suspense } from 'react';
import { TradingInterface } from '@/components/trading/TradingInterface';
import { MarketOverview } from '@/components/trading/MarketOverview';
import { TradingChartSkeleton } from '@/components/skeletons';

// Datos estáticos - ISR cada hora
async function getAvailablePairs() {
  const res = await fetch(`${process.env.API_URL}/pairs`, {
    next: { revalidate: 3600 }, // 1 hora
  });
  
  if (!res.ok) throw new Error('Failed to fetch pairs');
  return res.json();
}

// Datos dinámicos por usuario
async function getUserPositions(userId: string) {
  const res = await fetch(`${process.env.API_URL}/positions/${userId}`, {
    cache: 'no-store', // Siempre fresco
    headers: {
      Authorization: `Bearer ${await getAuthToken()}`,
    },
  });
  
  if (!res.ok) throw new Error('Failed to fetch positions');
  return res.json();
}

export default async function TradingPage() {
  // Fetch paralelo en servidor
  const [pairs, positions] = await Promise.all([
    getAvailablePairs(),
    getUserPositions(),
  ]);

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Market Overview - Datos del servidor */}
      <div className="col-span-3">
        <MarketOverview pairs={pairs} />
      </div>
      
      {/* Trading Chart - Client Component con Suspense */}
      <div className="col-span-6">
        <Suspense fallback={<TradingChartSkeleton />}>
          <TradingInterface 
            availablePairs={pairs}
            initialPositions={positions}
          />
        </Suspense>
      </div>
      
      {/* Order Form & Book - Client Components */}
      <div className="col-span-3">
        <Suspense fallback={<div className="animate-pulse" />}>
          <OrderPanel />
        </Suspense>
      </div>
    </div>
  );
}
```

#### Loading UI con Skeleton

```tsx
// app/(dashboard)/trading/loading.tsx
export default function TradingLoading() {
  return (
    <div className="grid grid-cols-12 gap-4 h-full animate-pulse">
      {/* Market Overview Skeleton */}
      <div className="col-span-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-lg" />
        ))}
      </div>
      
      {/* Chart Skeleton */}
      <div className="col-span-6">
        <div className="h-full bg-muted rounded-lg" />
      </div>
      
      {/* Order Panel Skeleton */}
      <div className="col-span-3 space-y-4">
        <div className="h-48 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
```

### 3. 📊 Integración de TradingView

Domino la implementación de Lightweight Charts y Advanced Charting Library:

```tsx
// components/charts/TradingChart.tsx
'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineStyle,
} from 'lightweight-charts';
import { usePriceStream } from '@/hooks/usePriceStream';

interface TradingChartProps {
  symbol: string;
  initialData: CandlestickData[];
  onCrosshairMove?: (price: number | null) => void;
}

export const TradingChart = memo(function TradingChart({
  symbol,
  initialData,
  onCrosshairMove,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  // Real-time price updates
  const { lastCandle, isConnected } = usePriceStream(symbol);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: '#0a0a0f' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#1f1f2e' },
        horzLines: { color: '#1f1f2e' },
      },
      crosshair: {
        mode: 0, // Normal
        vertLine: {
          width: 1,
          color: '#6366f1',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: '#6366f1',
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#2d2d3d',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2d2d3d',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#6366f1',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay
    });

    // Set initial data
    candleSeries.setData(initialData);
    
    // Volume data
    const volumeData = initialData.map(d => ({
      time: d.time,
      value: d.volume ?? 0,
      color: d.close >= d.open ? '#22c55e40' : '#ef444440',
    }));
    volumeSeries.setData(volumeData);

    // Store refs
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Crosshair handler
    if (onCrosshairMove) {
      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time) {
          onCrosshairMove(null);
          return;
        }
        const price = param.seriesData.get(candleSeries);
        if (price && 'close' in price) {
          onCrosshairMove(price.close);
        }
      });
    }

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [initialData, onCrosshairMove]);

  // Update with real-time data
  useEffect(() => {
    if (!lastCandle || !candleSeriesRef.current) return;

    // Update candle
    candleSeriesRef.current.update(lastCandle);

    // Update volume
    if (volumeSeriesRef.current && lastCandle.volume) {
      volumeSeriesRef.current.update({
        time: lastCandle.time,
        value: lastCandle.volume,
        color: lastCandle.close >= lastCandle.open ? '#22c55e40' : '#ef444440',
      });
    }
  }, [lastCandle]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Connection indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
});
```

#### TradingView Advanced Charting Library Datafeed

```typescript
// lib/tradingview/datafeed.ts
import {
  IBasicDataFeed,
  LibrarySymbolInfo,
  SearchSymbolResultItem,
  Bar,
  ResolutionString,
} from '@/types/tradingview';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Custom Datafeed para TradingView Advanced Charting Library
 * Implementa la interfaz JS API para datos del exchange
 */
export const createDatafeed = (
  onRealtimeCallback: (bar: Bar) => void,
): IBasicDataFeed => ({
  
  onReady: (callback) => {
    console.log('[TradingView] Datafeed ready');
    
    setTimeout(() => callback({
      supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W'] as ResolutionString[],
      exchanges: [
        { value: 'binance', name: 'Binance', desc: 'Binance Exchange' },
        { value: 'coinbase', name: 'Coinbase', desc: 'Coinbase Exchange' },
      ],
      symbols_types: [
        { name: 'crypto', value: 'crypto' },
      ],
    }), 0);
  },

  searchSymbols: async (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: SearchSymbolResultItem[]) => void,
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/symbols/search?query=${userInput}&exchange=${exchange}`
      );
      const symbols = await response.json();
      
      onResultReadyCallback(symbols.map((s: any) => ({
        symbol: s.symbol,
        full_name: s.fullName,
        description: s.description,
        exchange: s.exchange,
        type: 'crypto',
      })));
    } catch (error) {
      console.error('[TradingView] Search error:', error);
      onResultReadyCallback([]);
    }
  },

  resolveSymbol: async (
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: LibrarySymbolInfo) => void,
    onResolveErrorCallback: (error: string) => void,
  ) => {
    try {
      const [base, quote] = symbolName.split('/');
      
      const symbolInfo: LibrarySymbolInfo = {
        ticker: symbolName,
        name: symbolName,
        description: `${base} / ${quote}`,
        type: 'crypto',
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: 'NeuralTrade',
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        has_weekly_and_monthly: true,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W'] as ResolutionString[],
        volume_precision: 8,
        data_status: 'streaming',
      };
      
      setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    } catch (error) {
      onResolveErrorCallback('Symbol not found');
    }
  },

  getBars: async (
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: { from: number; to: number; firstDataRequest: boolean },
    onHistoryCallback: (bars: Bar[], meta: { noData?: boolean }) => void,
    onErrorCallback: (error: string) => void,
  ) => {
    try {
      const { from, to, firstDataRequest } = periodParams;
      
      const response = await fetch(
        `${API_URL}/market/${symbolInfo.ticker}/candles?` +
        `resolution=${resolution}&from=${from}&to=${to}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.length) {
        onHistoryCallback([], { noData: true });
        return;
      }
      
      const bars: Bar[] = data.map((candle: any) => ({
        time: candle.timestamp * 1000, // TradingView uses ms
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));
      
      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      console.error('[TradingView] getBars error:', error);
      onErrorCallback(String(error));
    }
  },

  subscribeBars: (
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onRealtimeCallback: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void,
  ) => {
    console.log('[TradingView] Subscribing to', symbolInfo.ticker);
    // La conexión WebSocket se maneja externamente
    // y llama onRealtimeCallback cuando hay updates
  },

  unsubscribeBars: (subscriberUID: string) => {
    console.log('[TradingView] Unsubscribing', subscriberUID);
  },
});
```

### 4. 🔄 Real-Time & WebSockets

Implemento conexiones persistentes optimizadas:

```typescript
// hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { create } from 'zustand';

interface WebSocketState {
  isConnected: boolean;
  lastMessage: unknown;
  connect: () => void;
  disconnect: () => void;
  send: (data: unknown) => void;
}

/**
 * WebSocket Manager Singleton
 * Mantiene una única conexión compartida entre componentes
 */
class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<(data: unknown) => void>>();
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private reconnectDelay = 1000;
  
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  connect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      // Re-subscribe all channels
      this.subscribers.forEach((_, channel) => {
        this.send({ action: 'subscribe', channel });
      });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const channel = data.channel || 'default';
        
        // Notify all subscribers of this channel
        this.subscribers.get(channel)?.forEach(callback => callback(data));
      } catch (error) {
        console.error('[WS] Parse error:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('[WS] Disconnected');
      this.handleReconnect(url);
    };
    
    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }
  
  private handleReconnect(url: string): void {
    if (this.reconnectAttempts < this.maxReconnects) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[WS] Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnects})`);
      setTimeout(() => this.connect(url), delay);
    }
  }
  
  subscribe(channel: string, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      // Subscribe on server
      if (this.isConnected) {
        this.send({ action: 'subscribe', channel });
      }
    }
    
    this.subscribers.get(channel)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(channel)?.delete(callback);
      if (this.subscribers.get(channel)?.size === 0) {
        this.subscribers.delete(channel);
        this.send({ action: 'unsubscribe', channel });
      }
    };
  }
  
  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

/**
 * Hook para suscribirse a un canal específico
 */
export function useWebSocketChannel<T>(channel: string): {
  data: T | null;
  isConnected: boolean;
  send: (data: unknown) => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsManager = useRef(WebSocketManager.getInstance());
  
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL!;
    wsManager.current.connect(url);
    
    const unsubscribe = wsManager.current.subscribe(channel, (newData) => {
      setData(newData as T);
    });
    
    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(wsManager.current.isConnected);
    }, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [channel]);
  
  const send = useCallback((data: unknown) => {
    wsManager.current.send({ channel, ...data });
  }, [channel]);
  
  return { data, isConnected, send };
}
```

#### Price Stream Hook Optimizado

```typescript
// hooks/usePriceStream.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CandlestickData } from 'lightweight-charts';
import { useWebSocketChannel } from './useWebSocket';

interface PriceUpdate {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change24h: number;
}

interface UsePriceStreamReturn {
  lastCandle: CandlestickData | null;
  currentPrice: number | null;
  change24h: number | null;
  isConnected: boolean;
}

/**
 * Hook para stream de precios en tiempo real
 * Optimizado para minimizar re-renders
 */
export function usePriceStream(symbol: string): UsePriceStreamReturn {
  const { data, isConnected } = useWebSocketChannel<PriceUpdate>(`price:${symbol}`);
  
  // Usar refs para datos que no necesitan re-render
  const currentCandleRef = useRef<Partial<CandlestickData>>({});
  const lastCandleTimeRef = useRef<number>(0);
  
  // Solo estos estados causan re-render
  const [lastCandle, setLastCandle] = useState<CandlestickData | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  
  useEffect(() => {
    if (!data) return;
    
    const { price, volume, timestamp, change24h: change } = data;
    const candleTime = Math.floor(timestamp / 60000) * 60; // 1min candle
    
    // Update current price (batched)
    setCurrentPrice(price);
    setChange24h(change);
    
    // New candle?
    if (candleTime > lastCandleTimeRef.current) {
      // Save previous candle
      if (lastCandleTimeRef.current > 0) {
        setLastCandle({
          time: lastCandleTimeRef.current as any,
          open: currentCandleRef.current.open!,
          high: currentCandleRef.current.high!,
          low: currentCandleRef.current.low!,
          close: currentCandleRef.current.close!,
          volume: currentCandleRef.current.volume,
        });
      }
      
      // Start new candle
      lastCandleTimeRef.current = candleTime;
      currentCandleRef.current = {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
      };
    } else {
      // Update current candle
      currentCandleRef.current.close = price;
      currentCandleRef.current.high = Math.max(
        currentCandleRef.current.high || price,
        price
      );
      currentCandleRef.current.low = Math.min(
        currentCandleRef.current.low || price,
        price
      );
      currentCandleRef.current.volume = (currentCandleRef.current.volume || 0) + volume;
    }
  }, [data]);
  
  return { lastCandle, currentPrice, change24h, isConnected };
}
```

### 5. ⚡ Optimización de Datos

Uso de Suspense para streaming y caché con fetch nativo:

```tsx
// components/trading/MarketOverview.tsx
import { Suspense } from 'react';
import { PriceCard, PriceCardSkeleton } from './PriceCard';

interface MarketPair {
  symbol: string;
  name: string;
  exchange: string;
}

interface MarketOverviewProps {
  pairs: MarketPair[];
}

export function MarketOverview({ pairs }: MarketOverviewProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground mb-4">Markets</h2>
      
      {pairs.map((pair) => (
        <Suspense key={pair.symbol} fallback={<PriceCardSkeleton />}>
          {/* Cada tarjeta hace su propio fetch con streaming */}
          <PriceCardAsync pair={pair} />
        </Suspense>
      ))}
    </div>
  );
}

// Componente async que fetchea sus propios datos
async function PriceCardAsync({ pair }: { pair: MarketPair }) {
  // Fetch con cache corto para datos de mercado
  const priceData = await fetch(
    `${process.env.API_URL}/market/${pair.symbol}/price`,
    { next: { revalidate: 10 } } // 10 segundos
  ).then(res => res.json());
  
  return (
    <PriceCard
      symbol={pair.symbol}
      name={pair.name}
      initialPrice={priceData.price}
      initialChange={priceData.change24h}
    />
  );
}
```

#### Server Actions para Mutaciones

```typescript
// app/(dashboard)/trading/actions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getServerSession } from 'next-auth';

// Schema de validación
const OrderSchema = z.object({
  symbol: z.string().regex(/^[A-Z]+\/[A-Z]+$/),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
});

type OrderInput = z.infer<typeof OrderSchema>;

// Server Action para crear orden
export async function createOrder(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  // Validar input
  const input = OrderSchema.parse({
    symbol: formData.get('symbol'),
    side: formData.get('side'),
    type: formData.get('type'),
    quantity: Number(formData.get('quantity')),
    price: formData.get('price') ? Number(formData.get('price')) : undefined,
  });
  
  // Llamar al API
  const response = await fetch(`${process.env.API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }
  
  // Revalidar cache
  revalidateTag('orders');
  revalidateTag('positions');
  revalidatePath('/trading');
  
  return response.json();
}

// Server Action para cancelar orden
export async function cancelOrder(orderId: string) {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  const response = await fetch(`${process.env.API_URL}/orders/${orderId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to cancel order');
  }
  
  revalidateTag('orders');
  revalidatePath('/trading');
  
  return { success: true };
}
```

---

## Conocimiento Técnico Avanzado

### Server Components vs Client Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DECISIÓN: ¿SERVER O CLIENT COMPONENT?                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USA SERVER COMPONENT CUANDO:                                           │
│  ✅ Fetch de datos (acceso directo a DB/API)                           │
│  ✅ Acceso a recursos del servidor (filesystem, env secrets)           │
│  ✅ Renderizado de contenido estático o semi-estático                  │
│  ✅ SEO es importante (meta tags, structured data)                     │
│  ✅ No hay interactividad (no onClick, onChange, etc.)                 │
│                                                                         │
│  USA CLIENT COMPONENT CUANDO:                                           │
│  ✅ Interactividad (onClick, onChange, onSubmit)                       │
│  ✅ useEffect, useState, u otros hooks                                 │
│  ✅ Browser APIs (localStorage, WebSocket, canvas)                     │
│  ✅ Event listeners                                                    │
│  ✅ Bibliotecas que usan Context o DOM                                 │
│                                                                         │
│  PATRÓN ÓPTIMO:                                                        │
│  Server Component (data fetching)                                       │
│       └─► Client Component (interactivity)                             │
│               └─► Props pasados desde servidor                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Middleware para Autenticación Financiera

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rutas que requieren autenticación
const protectedRoutes = ['/trading', '/portfolio', '/signals', '/settings'];

// Rutas que requieren 2FA para operaciones financieras
const sensitiveRoutes = ['/trading', '/withdraw'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip para assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Verificar autenticación
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Verificar 2FA para rutas sensibles
  const isSensitiveRoute = sensitiveRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isSensitiveRoute && token && !token.twoFactorVerified) {
    const verifyUrl = new URL('/verify-2fa', request.url);
    verifyUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(verifyUrl);
  }
  
  // Rate limiting headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99');
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Optimización de Performance

```tsx
// Minimizar Layout Shift en dashboards

// 1. Definir dimensiones fijas para containers
const ChartContainer = ({ children }: { children: React.ReactNode }) => (
  <div 
    className="relative"
    style={{ 
      aspectRatio: '16/9',
      minHeight: '400px',
      contain: 'layout style paint', // CSS containment
    }}
  >
    {children}
  </div>
);

// 2. Skeleton con dimensiones idénticas al contenido
const PriceCardSkeleton = () => (
  <div 
    className="h-16 w-full animate-pulse rounded-lg bg-muted"
    style={{ minHeight: '64px' }} // Match exact height
  />
);

// 3. Font preloading para evitar FOUT
// next.config.js
module.exports = {
  experimental: {
    optimizeFonts: true,
  },
};

// 4. Prefetch de datos críticos
const Dashboard = async () => {
  // Parallel fetch para datos críticos above-the-fold
  const [portfolio, watchlist, alerts] = await Promise.all([
    getPortfolio(),
    getWatchlist(),
    getActiveAlerts(),
  ]);
  
  return (
    <>
      <PortfolioSummary data={portfolio} />
      <Watchlist data={watchlist} />
      <Suspense fallback={<AlertsSkeleton />}>
        <AlertsPanel initialData={alerts} />
      </Suspense>
    </>
  );
};
```

---

## Reglas Críticas

### 1. 🖥️ Prioridad al Servidor

```tsx
// ❌ MAL - Fetch en cliente para datos iniciales
'use client';
export function TradingPairs() {
  const [pairs, setPairs] = useState([]);
  
  useEffect(() => {
    fetch('/api/pairs').then(res => res.json()).then(setPairs);
  }, []);
  
  return <PairsList pairs={pairs} />;
}

// ✅ BIEN - Fetch en servidor, pasar como props
// Server Component
export async function TradingPairs() {
  const pairs = await fetch(`${process.env.API_URL}/pairs`, {
    next: { revalidate: 3600 }
  }).then(res => res.json());
  
  return <PairsList pairs={pairs} />;
}

// Client Component solo para interactividad
'use client';
function PairsList({ pairs }: { pairs: Pair[] }) {
  const [filter, setFilter] = useState('');
  // ...
}
```

### 2. 📝 Tipado Estricto

```typescript
// types/market.ts - Tipos compartidos

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceFeed {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  change24h: number;
  timestamp: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  quantity: number;
  price?: number;
  filledQuantity: number;
  filledPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Zod schemas para validación runtime
import { z } from 'zod';

export const OrderInputSchema = z.object({
  symbol: z.string().regex(/^[A-Z]+\/[A-Z]+$/),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
}).refine(
  data => data.type === 'market' || data.price !== undefined,
  { message: 'Price required for limit/stop orders' }
);

export type OrderInput = z.infer<typeof OrderInputSchema>;
```

### 3. 🔐 Seguridad

```typescript
// lib/auth.ts - Manejo seguro de API Keys

import { encrypt, decrypt } from '@/lib/crypto';

// NUNCA exponer API keys en el cliente
// Las API keys de exchanges solo se usan en Server Components / Server Actions

export async function getExchangeClient(userId: string) {
  // Fetch encrypted keys from database
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { encryptedApiKey: true, encryptedApiSecret: true },
  });
  
  if (!user?.encryptedApiKey) {
    throw new Error('No API keys configured');
  }
  
  // Decrypt only on server
  const apiKey = decrypt(user.encryptedApiKey);
  const apiSecret = decrypt(user.encryptedApiSecret);
  
  return createExchangeClient({ apiKey, apiSecret });
}

// Para el cliente, usar tokens de sesión limitados
export function createLimitedToken(userId: string, permissions: string[]) {
  return jwt.sign(
    { userId, permissions, type: 'limited' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
}
```

---

## Checklist de Revisión

### Antes de Deploy

```yaml
Arquitectura:
  - [ ] Estructura App Router correcta
  - [ ] Server/Client components bien separados
  - [ ] Loading states para todas las rutas
  - [ ] Error boundaries implementados

Rendering:
  - [ ] Datos estáticos con ISR apropiado
  - [ ] Datos dinámicos fetch en servidor
  - [ ] Real-time via WebSocket en cliente
  - [ ] Suspense para streaming

Performance:
  - [ ] Lighthouse score > 90
  - [ ] No Layout Shift (CLS < 0.1)
  - [ ] Fonts optimizadas
  - [ ] Images con next/image

Seguridad:
  - [ ] Middleware de autenticación
  - [ ] API keys nunca en cliente
  - [ ] CSRF protection
  - [ ] Security headers configurados

Tipado:
  - [ ] Tipos para todos los API responses
  - [ ] Zod validation para inputs
  - [ ] No any escapados
```

---

*Next.js Trading Architect: Datos en el servidor, interactividad en el cliente, tiempo real en WebSocket.*
