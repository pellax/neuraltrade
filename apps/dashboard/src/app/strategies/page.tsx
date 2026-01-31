'use client';

/**
 * Strategies Page
 * Manage and monitor trading strategies
 */

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

// Mock strategy data
interface Strategy {
    id: string;
    name: string;
    type: string;
    status: 'draft' | 'active' | 'paused' | 'stopped' | 'error';
    exchange: string;
    pairs: string[];
    winRate: number;
    totalPnL: number;
    totalTrades: number;
    createdAt: string;
}

const mockStrategies: Strategy[] = [
    {
        id: '1',
        name: 'BTC RSI Momentum',
        type: 'ml_signal',
        status: 'active',
        exchange: 'binance',
        pairs: ['BTC/USDT'],
        winRate: 68.5,
        totalPnL: 4250.80,
        totalTrades: 127,
        createdAt: '2026-01-15',
    },
    {
        id: '2',
        name: 'ETH Mean Reversion',
        type: 'mean_reversion',
        status: 'active',
        exchange: 'binance',
        pairs: ['ETH/USDT', 'ETH/BTC'],
        winRate: 72.1,
        totalPnL: 3120.45,
        totalTrades: 89,
        createdAt: '2026-01-18',
    },
    {
        id: '3',
        name: 'SOL Breakout Hunter',
        type: 'breakout',
        status: 'paused',
        exchange: 'bybit',
        pairs: ['SOL/USDT'],
        winRate: 54.3,
        totalPnL: -420.20,
        totalTrades: 35,
        createdAt: '2026-01-22',
    },
    {
        id: '4',
        name: 'Multi-Asset Trend',
        type: 'trend_following',
        status: 'draft',
        exchange: 'binance',
        pairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
        winRate: 0,
        totalPnL: 0,
        totalTrades: 0,
        createdAt: '2026-01-28',
    },
];

const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' },
    active: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' },
    paused: { bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15' },
    stopped: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af' },
    error: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' },
};

const typeLabels: Record<string, string> = {
    trend_following: 'Trend Following',
    mean_reversion: 'Mean Reversion',
    breakout: 'Breakout',
    ml_signal: 'ML Signal',
    custom: 'Custom',
};

export default function StrategiesPage() {
    const [currentRoute, setCurrentRoute] = useState('strategies');
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        setStrategies(mockStrategies);
    }, []);

    const filteredStrategies = filter === 'all'
        ? strategies
        : strategies.filter(s => s.status === filter);

    const stats = {
        total: strategies.length,
        active: strategies.filter(s => s.status === 'active').length,
        totalPnL: strategies.reduce((sum, s) => sum + s.totalPnL, 0),
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />

            <main
                style={{
                    flex: 1,
                    marginLeft: '240px',
                    padding: 'var(--space-6)',
                }}
            >
                {/* Header */}
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--space-6)'
                }}>
                    <div>
                        <h1 style={{ marginBottom: 'var(--space-2)' }}>Strategies</h1>
                        <p className="text-secondary">
                            Create and manage your trading strategies
                        </p>
                    </div>
                    <button className="btn-primary" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--brand-gradient)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>+</span>
                        New Strategy
                    </button>
                </header>

                {/* Stats Summary */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}>
                    {[
                        { label: 'Total Strategies', value: stats.total, icon: '📊' },
                        { label: 'Active', value: stats.active, icon: '🟢' },
                        { label: 'Total P&L', value: `$${stats.totalPnL.toLocaleString()}`, icon: stats.totalPnL >= 0 ? '📈' : '📉' },
                    ].map((stat) => (
                        <div key={stat.label} className="card" style={{
                            padding: 'var(--space-4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>{stat.label}</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-4)',
                }}>
                    {['all', 'active', 'paused', 'draft', 'stopped'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: filter === status ? 'var(--bg-elevated)' : 'transparent',
                                border: `1px solid ${filter === status ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                                borderRadius: 'var(--radius-md)',
                                color: filter === status ? 'var(--brand-cyan)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                fontSize: '0.875rem',
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Strategies Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: 'var(--space-4)',
                }}>
                    {filteredStrategies.map((strategy) => (
                        <div key={strategy.id} className="card" style={{
                            padding: 'var(--space-5)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-base)',
                        }}>
                            {/* Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 'var(--space-4)',
                            }}>
                                <div>
                                    <h3 style={{ marginBottom: 'var(--space-1)' }}>
                                        {strategy.name}
                                    </h3>
                                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        {typeLabels[strategy.type]} • {strategy.exchange}
                                    </span>
                                </div>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    background: statusColors[strategy.status].bg,
                                    color: statusColors[strategy.status].text,
                                }}>
                                    {strategy.status}
                                </span>
                            </div>

                            {/* Pairs */}
                            <div style={{
                                display: 'flex',
                                gap: 'var(--space-2)',
                                marginBottom: 'var(--space-4)',
                                flexWrap: 'wrap',
                            }}>
                                {strategy.pairs.map((pair) => (
                                    <span key={pair} style={{
                                        padding: '2px 8px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.75rem',
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--text-secondary)',
                                    }}>
                                        {pair}
                                    </span>
                                ))}
                            </div>

                            {/* Metrics */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 'var(--space-3)',
                                paddingTop: 'var(--space-4)',
                                borderTop: '1px solid var(--border-subtle)',
                            }}>
                                <div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>Win Rate</div>
                                    <div style={{
                                        fontWeight: 600,
                                        color: strategy.winRate >= 50 ? 'var(--status-success)' : 'var(--text-primary)',
                                    }}>
                                        {strategy.winRate}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>P&L</div>
                                    <div style={{
                                        fontWeight: 600,
                                        color: strategy.totalPnL >= 0 ? 'var(--status-success)' : 'var(--status-error)',
                                    }}>
                                        {strategy.totalPnL >= 0 ? '+' : ''}${strategy.totalPnL.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 2 }}>Trades</div>
                                    <div style={{ fontWeight: 600 }}>{strategy.totalTrades}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            {strategy.status !== 'draft' && (
                                <div style={{
                                    display: 'flex',
                                    gap: 'var(--space-2)',
                                    marginTop: 'var(--space-4)',
                                    paddingTop: 'var(--space-4)',
                                    borderTop: '1px solid var(--border-subtle)',
                                }}>
                                    {strategy.status === 'active' ? (
                                        <button style={{
                                            flex: 1,
                                            padding: 'var(--space-2)',
                                            background: 'rgba(250, 204, 21, 0.15)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            color: '#facc15',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                        }}>
                                            Pause
                                        </button>
                                    ) : strategy.status === 'paused' ? (
                                        <button style={{
                                            flex: 1,
                                            padding: 'var(--space-2)',
                                            background: 'rgba(74, 222, 128, 0.15)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            color: '#4ade80',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                        }}>
                                            Resume
                                        </button>
                                    ) : null}
                                    <button style={{
                                        flex: 1,
                                        padding: 'var(--space-2)',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}>
                                        View Details
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
