'use client';

/**
 * Trading Page
 * Live trading interface with order book, positions, and trade execution
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, TrendingDown, DollarSign, Percent, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Dynamic import for chart
const TradingChart = dynamic(() => import('@/components/TradingChart'), {
    ssr: false,
    loading: () => (
        <div className="card" style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-muted">Loading chart...</span>
        </div>
    ),
});

interface Position {
    id: string;
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    leverage: number;
    liquidationPrice: number;
    createdAt: string;
}

interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    price: number;
    size: number;
    filled: number;
    status: 'open' | 'partial' | 'filled' | 'cancelled';
    createdAt: string;
}

const mockPositions: Position[] = [
    {
        id: '1',
        symbol: 'BTC/USDT',
        side: 'long',
        size: 0.5,
        entryPrice: 41250.00,
        currentPrice: 42150.00,
        pnl: 450.00,
        pnlPercent: 2.18,
        leverage: 5,
        liquidationPrice: 35000.00,
        createdAt: '2026-01-31T10:30:00Z',
    },
    {
        id: '2',
        symbol: 'ETH/USDT',
        side: 'short',
        size: 5,
        entryPrice: 2450.00,
        currentPrice: 2420.00,
        pnl: 150.00,
        pnlPercent: 1.22,
        leverage: 3,
        liquidationPrice: 3200.00,
        createdAt: '2026-01-31T08:15:00Z',
    },
    {
        id: '3',
        symbol: 'SOL/USDT',
        side: 'long',
        size: 50,
        entryPrice: 98.50,
        currentPrice: 96.20,
        pnl: -115.00,
        pnlPercent: -2.33,
        leverage: 2,
        liquidationPrice: 52.00,
        createdAt: '2026-01-30T22:00:00Z',
    },
];

const mockOrders: Order[] = [
    { id: '1', symbol: 'BTC/USDT', side: 'buy', type: 'limit', price: 40500.00, size: 0.25, filled: 0, status: 'open', createdAt: '2026-01-31T12:00:00Z' },
    { id: '2', symbol: 'ETH/USDT', side: 'sell', type: 'stop', price: 2600.00, size: 3, filled: 0, status: 'open', createdAt: '2026-01-31T11:30:00Z' },
];

function generateMockCandles(count: number): any[] {
    const candles = [];
    let basePrice = 42000;
    const now = Date.now();

    for (let i = count; i > 0; i--) {
        const time = Math.floor((now - i * 60 * 1000) / 1000);
        const volatility = Math.random() * 200 - 100;
        const open = basePrice + volatility;
        const close = basePrice + (Math.random() * 300 - 150);
        const high = Math.max(open, close) + Math.random() * 100;
        const low = Math.min(open, close) - Math.random() * 100;
        candles.push({ time, open, high, low, close });
        basePrice = close;
    }
    return candles;
}

export default function TradingPage() {
    const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
    const [candles, setCandles] = useState<any[]>([]);
    const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('limit');
    const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
    const [orderPrice, setOrderPrice] = useState('42000');
    const [orderSize, setOrderSize] = useState('0.1');

    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'LINK/USDT'];
    const currentPrice = 42150.00;

    useEffect(() => {
        setCandles(generateMockCandles(200));
        const interval = setInterval(() => {
            setCandles(prev => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                const newCandle = {
                    time: last.time + 60,
                    open: last.close,
                    high: last.close + Math.random() * 50,
                    low: last.close - Math.random() * 50,
                    close: last.close + (Math.random() * 100 - 50),
                };
                return [...prev.slice(1), newCandle];
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Trading</h1>
                    <p className="text-secondary">Execute trades and manage positions</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {symbols.map(symbol => (
                        <button
                            key={symbol}
                            onClick={() => setSelectedSymbol(symbol)}
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: selectedSymbol === symbol ? 'var(--brand-gradient)' : 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: selectedSymbol === symbol ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: selectedSymbol === symbol ? 600 : 400,
                            }}
                        >
                            {symbol}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                {/* Chart */}
                <div>
                    <TradingChart symbol={selectedSymbol} data={candles} height={500} />
                </div>

                {/* Order Form */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Place Order</h3>

                    {/* Order Type Tabs */}
                    <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
                        {(['market', 'limit', 'stop'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setOrderType(type)}
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-2)',
                                    background: orderType === type ? 'var(--bg-elevated)' : 'transparent',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: orderType === type ? 'var(--text-primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Buy/Sell Tabs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        <button
                            onClick={() => setOrderSide('buy')}
                            style={{
                                padding: 'var(--space-3)',
                                background: orderSide === 'buy' ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                                border: orderSide === 'buy' ? '2px solid #4ade80' : '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: orderSide === 'buy' ? '#4ade80' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <TrendingUp size={18} /> Long/Buy
                        </button>
                        <button
                            onClick={() => setOrderSide('sell')}
                            style={{
                                padding: 'var(--space-3)',
                                background: orderSide === 'sell' ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
                                border: orderSide === 'sell' ? '2px solid #f87171' : '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: orderSide === 'sell' ? '#f87171' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <TrendingDown size={18} /> Short/Sell
                        </button>
                    </div>

                    {/* Price Input */}
                    {orderType !== 'market' && (
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: 'var(--space-1)' }}>
                                Price (USDT)
                            </label>
                            <input
                                type="number"
                                value={orderPrice}
                                onChange={e => setOrderPrice(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-3)',
                                    background: 'var(--bg-base)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>
                    )}

                    {/* Size Input */}
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                        <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: 'var(--space-1)' }}>
                            Size ({selectedSymbol.split('/')[0]})
                        </label>
                        <input
                            type="number"
                            value={orderSize}
                            onChange={e => setOrderSize(e.target.value)}
                            style={{
                                width: '100%',
                                padding: 'var(--space-3)',
                                background: 'var(--bg-base)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                            }}
                        />
                    </div>

                    {/* Quick Size Buttons */}
                    <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
                        {['25%', '50%', '75%', '100%'].map(pct => (
                            <button
                                key={pct}
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-2)',
                                    background: 'var(--bg-elevated)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                }}
                            >
                                {pct}
                            </button>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>
                            <span className="text-muted">Total</span>
                            <span>${(parseFloat(orderPrice || '0') * parseFloat(orderSize || '0')).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span className="text-muted">Fee (0.1%)</span>
                            <span>${((parseFloat(orderPrice || '0') * parseFloat(orderSize || '0')) * 0.001).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        style={{
                            width: '100%',
                            padding: 'var(--space-4)',
                            background: orderSide === 'buy' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: orderSide === 'buy' ? '0 4px 20px rgba(34, 197, 94, 0.3)' : '0 4px 20px rgba(239, 68, 68, 0.3)',
                        }}
                    >
                        {orderSide === 'buy' ? 'Open Long' : 'Open Short'} {selectedSymbol}
                    </button>
                </div>
            </div>

            {/* Positions & Orders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Open Positions */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Open Positions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {mockPositions.map(position => (
                            <div
                                key={position.id}
                                style={{
                                    padding: 'var(--space-3)',
                                    background: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${position.pnl >= 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <span style={{ fontWeight: 600 }}>{position.symbol}</span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                            background: position.side === 'long' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                            color: position.side === 'long' ? '#4ade80' : '#f87171',
                                        }}>
                                            {position.side} {position.leverage}x
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: position.pnl >= 0 ? '#4ade80' : '#f87171' }}>
                                        {position.pnl >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                        <span style={{ fontWeight: 600 }}>${Math.abs(position.pnl).toFixed(2)}</span>
                                        <span style={{ fontSize: '0.875rem' }}>({position.pnlPercent > 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)</span>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', fontSize: '0.75rem' }}>
                                    <div>
                                        <span className="text-muted">Size</span>
                                        <div>{position.size}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted">Entry</span>
                                        <div>${position.entryPrice.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted">Current</span>
                                        <div>${position.currentPrice.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Open Orders */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Open Orders</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {mockOrders.map(order => (
                            <div
                                key={order.id}
                                style={{
                                    padding: 'var(--space-3)',
                                    background: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                                        <span style={{ fontWeight: 600 }}>{order.symbol}</span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                            background: order.side === 'buy' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                            color: order.side === 'buy' ? '#4ade80' : '#f87171',
                                        }}>
                                            {order.type} {order.side}
                                        </span>
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        {order.size} @ ${order.price.toLocaleString()}
                                    </div>
                                </div>
                                <button style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    background: 'rgba(248, 113, 113, 0.1)',
                                    border: '1px solid rgba(248, 113, 113, 0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}>
                                    Cancel
                                </button>
                            </div>
                        ))}
                        {mockOrders.length === 0 && (
                            <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                                No open orders
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
