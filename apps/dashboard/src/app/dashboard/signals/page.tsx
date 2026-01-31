'use client';

/**
 * Signals Page
 * AI-generated trading signals and alerts
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Bell, BellOff, Filter, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Signal {
    id: string;
    symbol: string;
    direction: 'long' | 'short' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
    confidence: number;
    entryPrice: number;
    targets: number[];
    stopLoss: number;
    riskReward: number;
    indicators: string[];
    timeframe: string;
    status: 'active' | 'triggered' | 'expired';
    createdAt: string;
    expiresAt: string;
    mlModel: string;
}

const mockSignals: Signal[] = [
    {
        id: '1',
        symbol: 'BTC/USDT',
        direction: 'long',
        strength: 'strong',
        confidence: 0.92,
        entryPrice: 42100,
        targets: [43500, 44800, 46000],
        stopLoss: 40500,
        riskReward: 2.5,
        indicators: ['RSI Oversold', 'MACD Bullish Crossover', 'Volume Spike'],
        timeframe: '4h',
        status: 'active',
        createdAt: '2026-01-31T19:00:00Z',
        expiresAt: '2026-02-01T07:00:00Z',
        mlModel: 'Momentum Alpha v2.1',
    },
    {
        id: '2',
        symbol: 'ETH/USDT',
        direction: 'short',
        strength: 'moderate',
        confidence: 0.78,
        entryPrice: 2480,
        targets: [2350, 2280],
        stopLoss: 2580,
        riskReward: 1.8,
        indicators: ['Bearish Divergence', 'Resistance Rejection'],
        timeframe: '1h',
        status: 'active',
        createdAt: '2026-01-31T18:30:00Z',
        expiresAt: '2026-01-31T22:30:00Z',
        mlModel: 'Mean Reversion v1.5',
    },
    {
        id: '3',
        symbol: 'SOL/USDT',
        direction: 'long',
        strength: 'strong',
        confidence: 0.88,
        entryPrice: 95.50,
        targets: [102, 108, 115],
        stopLoss: 90,
        riskReward: 3.2,
        indicators: ['Breakout Confirmation', 'OBV Rising', 'ADX Strong Trend'],
        timeframe: '4h',
        status: 'triggered',
        createdAt: '2026-01-31T14:00:00Z',
        expiresAt: '2026-02-01T02:00:00Z',
        mlModel: 'Breakout Hunter v3.0',
    },
    {
        id: '4',
        symbol: 'AVAX/USDT',
        direction: 'neutral',
        strength: 'weak',
        confidence: 0.55,
        entryPrice: 38.20,
        targets: [],
        stopLoss: 0,
        riskReward: 0,
        indicators: ['Consolidation Pattern', 'Low Volatility'],
        timeframe: '1h',
        status: 'expired',
        createdAt: '2026-01-31T10:00:00Z',
        expiresAt: '2026-01-31T14:00:00Z',
        mlModel: 'Pattern Recognition v2.0',
    },
];

export default function SignalsPage() {
    const [signals, setSignals] = useState(mockSignals);
    const [filter, setFilter] = useState<'all' | 'active' | 'triggered' | 'expired'>('all');
    const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
    const [notifications, setNotifications] = useState(true);

    const filteredSignals = signals.filter(signal => {
        if (filter !== 'all' && signal.status !== filter) return false;
        if (directionFilter !== 'all' && signal.direction !== directionFilter) return false;
        return true;
    });

    const directionColors = {
        long: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80', icon: <TrendingUp size={18} /> },
        short: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171', icon: <TrendingDown size={18} /> },
        neutral: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', icon: <Minus size={18} /> },
    };

    const strengthColors = {
        strong: '#4ade80',
        moderate: '#facc15',
        weak: '#9ca3af',
    };

    const statusIcons = {
        active: <Clock size={14} />,
        triggered: <CheckCircle size={14} />,
        expired: <AlertCircle size={14} />,
    };

    const formatTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m ago`;
        return `${minutes}m ago`;
    };

    return (
        <>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Trading Signals</h1>
                    <p className="text-secondary">AI-generated trading opportunities from ML models</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                        onClick={() => setNotifications(!notifications)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-3)',
                            background: notifications ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-elevated)',
                            border: `1px solid ${notifications ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                            borderRadius: 'var(--radius-md)',
                            color: notifications ? 'var(--brand-cyan)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        {notifications ? <Bell size={18} /> : <BellOff size={18} />}
                        {notifications ? 'Alerts On' : 'Alerts Off'}
                    </button>
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-3)',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Active Signals</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                        {signals.filter(s => s.status === 'active').length}
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Long Signals</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>
                        {signals.filter(s => s.direction === 'long' && s.status === 'active').length}
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Short Signals</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171' }}>
                        {signals.filter(s => s.direction === 'short' && s.status === 'active').length}
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Avg Confidence</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {(signals.filter(s => s.status === 'active').reduce((sum, s) => sum + s.confidence, 0) / signals.filter(s => s.status === 'active').length * 100 || 0).toFixed(0)}%
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Triggered Today</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {signals.filter(s => s.status === 'triggered').length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    {(['all', 'active', 'triggered', 'expired'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: filter === status ? 'var(--bg-elevated)' : 'transparent',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: filter === status ? 'var(--text-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textTransform: 'capitalize',
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    {(['all', 'long', 'short'] as const).map(direction => (
                        <button
                            key={direction}
                            onClick={() => setDirectionFilter(direction)}
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: directionFilter === direction ? 'var(--bg-elevated)' : 'transparent',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: directionFilter === direction ? 'var(--text-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textTransform: 'capitalize',
                            }}
                        >
                            {direction === 'all' ? 'All Directions' : direction}
                        </button>
                    ))}
                </div>
            </div>

            {/* Signals List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {filteredSignals.map(signal => (
                    <div
                        key={signal.id}
                        className="card"
                        style={{
                            padding: 'var(--space-5)',
                            opacity: signal.status === 'expired' ? 0.6 : 1,
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 'var(--radius-md)',
                                    background: directionColors[signal.direction].bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: directionColors[signal.direction].text,
                                }}>
                                    {directionColors[signal.direction].icon}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                                        <h3>{signal.symbol}</h3>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            background: directionColors[signal.direction].bg,
                                            color: directionColors[signal.direction].text,
                                        }}>
                                            {signal.direction}
                                        </span>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            background: 'var(--bg-elevated)',
                                            color: strengthColors[signal.strength],
                                            textTransform: 'capitalize',
                                        }}>
                                            {signal.strength}
                                        </span>
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', gap: 'var(--space-3)' }}>
                                        <span>🤖 {signal.mlModel}</span>
                                        <span>⏱️ {signal.timeframe}</span>
                                        <span>🕐 {formatTimeAgo(signal.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    background: signal.status === 'active' ? 'rgba(6, 182, 212, 0.15)' : signal.status === 'triggered' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                                    color: signal.status === 'active' ? 'var(--brand-cyan)' : signal.status === 'triggered' ? '#4ade80' : '#9ca3af',
                                    textTransform: 'capitalize',
                                }}>
                                    {statusIcons[signal.status]}
                                    {signal.status}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>
                                    {(signal.confidence * 100).toFixed(0)}%
                                    <span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 400, marginLeft: 4 }}>confidence</span>
                                </div>
                            </div>
                        </div>

                        {/* Trading Info */}
                        {signal.direction !== 'neutral' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Entry Price</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>${signal.entryPrice.toLocaleString()}</div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Targets</div>
                                    <div style={{ fontWeight: 600, color: '#4ade80' }}>
                                        {signal.targets.map((t, i) => `$${t.toLocaleString()}`).join(' → ')}
                                    </div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Stop Loss</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#f87171' }}>${signal.stopLoss.toLocaleString()}</div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Risk/Reward</div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{signal.riskReward}:1</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {signal.status === 'active' && (
                                        <button style={{
                                            padding: 'var(--space-3) var(--space-4)',
                                            background: 'var(--brand-gradient)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'white',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}>
                                            Execute Trade
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Indicators */}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            {signal.indicators.map(indicator => (
                                <span
                                    key={indicator}
                                    style={{
                                        padding: '4px 12px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {indicator}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredSignals.length === 0 && (
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📊</div>
                        <h3 style={{ marginBottom: 'var(--space-2)' }}>No Signals Found</h3>
                        <p className="text-muted">No signals match your current filters</p>
                    </div>
                )}
            </div>
        </>
    );
}
