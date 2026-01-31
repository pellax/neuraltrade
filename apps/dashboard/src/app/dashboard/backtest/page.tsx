'use client';

/**
 * Backtest Page
 * Run and analyze historical backtests of trading strategies
 */

import { useState } from 'react';
import { Play, Clock, TrendingUp, TrendingDown, BarChart3, Calendar, Target, Shield, Zap } from 'lucide-react';

interface BacktestResult {
    id: string;
    name: string;
    strategy: string;
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    status: 'completed' | 'running' | 'failed';
    metrics: {
        totalReturn: number;
        sharpeRatio: number;
        maxDrawdown: number;
        winRate: number;
        totalTrades: number;
        profitFactor: number;
    };
    createdAt: string;
}

const mockResults: BacktestResult[] = [
    {
        id: '1',
        name: 'BTC Momentum Strategy',
        strategy: 'RSI + MACD Crossover',
        symbol: 'BTC/USDT',
        timeframe: '4h',
        startDate: '2025-01-01',
        endDate: '2026-01-31',
        status: 'completed',
        metrics: {
            totalReturn: 156.4,
            sharpeRatio: 2.34,
            maxDrawdown: -12.3,
            winRate: 67.8,
            totalTrades: 234,
            profitFactor: 1.89,
        },
        createdAt: '2026-01-31T10:00:00Z',
    },
    {
        id: '2',
        name: 'ETH Grid Strategy',
        strategy: 'Grid Trading',
        symbol: 'ETH/USDT',
        timeframe: '1h',
        startDate: '2025-06-01',
        endDate: '2026-01-31',
        status: 'completed',
        metrics: {
            totalReturn: 42.1,
            sharpeRatio: 1.56,
            maxDrawdown: -18.7,
            winRate: 58.2,
            totalTrades: 1256,
            profitFactor: 1.34,
        },
        createdAt: '2026-01-30T15:30:00Z',
    },
    {
        id: '3',
        name: 'SOL Mean Reversion',
        strategy: 'Bollinger Bands Breakout',
        symbol: 'SOL/USDT',
        timeframe: '15m',
        startDate: '2025-09-01',
        endDate: '2026-01-31',
        status: 'running',
        metrics: {
            totalReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            totalTrades: 0,
            profitFactor: 0,
        },
        createdAt: '2026-01-31T19:00:00Z',
    },
];

const strategies = [
    'RSI + MACD Crossover',
    'Bollinger Bands Breakout',
    'Moving Average Crossover',
    'Grid Trading',
    'DCA Strategy',
    'ML Signal Follower',
];

const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT'];
const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

export default function BacktestPage() {
    const [showNewBacktest, setShowNewBacktest] = useState(false);
    const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        strategy: strategies[0],
        symbol: symbols[0],
        timeframe: timeframes[3],
        startDate: '2025-01-01',
        endDate: '2026-01-31',
        initialCapital: '10000',
    });

    return (
        <>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Backtesting</h1>
                    <p className="text-secondary">Test your strategies against historical data</p>
                </div>
                <button
                    onClick={() => setShowNewBacktest(true)}
                    style={{
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
                        boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
                    }}
                >
                    <Play size={20} /> New Backtest
                </button>
            </header>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Total Backtests</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{mockResults.length}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Best Return</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>+156.4%</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Avg Sharpe Ratio</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>1.95</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Running</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                        {mockResults.filter(r => r.status === 'running').length}
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {mockResults.map(result => (
                    <div
                        key={result.id}
                        className="card"
                        style={{
                            padding: 'var(--space-5)',
                            cursor: 'pointer',
                            border: selectedResult?.id === result.id ? '1px solid var(--brand-cyan)' : '1px solid var(--border-subtle)',
                        }}
                        onClick={() => setSelectedResult(result)}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                                    <h3>{result.name}</h3>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.75rem',
                                        background: result.status === 'completed' ? 'rgba(74, 222, 128, 0.15)' : result.status === 'running' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                        color: result.status === 'completed' ? '#4ade80' : result.status === 'running' ? 'var(--brand-cyan)' : '#f87171',
                                        textTransform: 'capitalize',
                                    }}>
                                        {result.status === 'running' && <span style={{ marginRight: 4 }}>⏳</span>}
                                        {result.status}
                                    </span>
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', gap: 'var(--space-4)' }}>
                                    <span>📈 {result.symbol}</span>
                                    <span>📊 {result.strategy}</span>
                                    <span>⏱️ {result.timeframe}</span>
                                    <span>📅 {result.startDate} → {result.endDate}</span>
                                </div>
                            </div>
                            {result.status === 'completed' && (
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: result.metrics.totalReturn >= 0 ? '#4ade80' : '#f87171',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)',
                                    }}>
                                        {result.metrics.totalReturn >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                        {result.metrics.totalReturn >= 0 ? '+' : ''}{result.metrics.totalReturn}%
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>Total Return</div>
                                </div>
                            )}
                        </div>

                        {/* Metrics Grid */}
                        {result.status === 'completed' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-4)' }}>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <BarChart3 size={12} /> Sharpe Ratio
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{result.metrics.sharpeRatio}</div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Shield size={12} /> Max Drawdown
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#f87171' }}>{result.metrics.maxDrawdown}%</div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Target size={12} /> Win Rate
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{result.metrics.winRate}%</div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Zap size={12} /> Total Trades
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{result.metrics.totalTrades}</div>
                                </div>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <TrendingUp size={12} /> Profit Factor
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{result.metrics.profitFactor}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <button style={{
                                        padding: 'var(--space-2) var(--space-4)',
                                        background: 'var(--brand-gradient)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        )}

                        {result.status === 'running' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{
                                    width: 24,
                                    height: 24,
                                    border: '3px solid var(--brand-cyan)',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                }} />
                                <div>
                                    <div style={{ fontWeight: 500 }}>Running backtest...</div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>Processing historical data</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* New Backtest Modal */}
            {showNewBacktest && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }} onClick={() => setShowNewBacktest(false)}>
                    <div className="card" style={{
                        width: '100%',
                        maxWidth: 600,
                        padding: 'var(--space-6)',
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: 'var(--space-5)' }}>New Backtest</h2>

                        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                            <div>
                                <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                    Backtest Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="My Backtest"
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-base)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div>
                                    <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Strategy
                                    </label>
                                    <select
                                        value={formData.strategy}
                                        onChange={e => setFormData({ ...formData, strategy: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {strategies.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Symbol
                                    </label>
                                    <select
                                        value={formData.symbol}
                                        onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                                <div>
                                    <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Timeframe
                                    </label>
                                    <select
                                        value={formData.timeframe}
                                        onChange={e => setFormData({ ...formData, timeframe: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                    Initial Capital (USDT)
                                </label>
                                <input
                                    type="number"
                                    value={formData.initialCapital}
                                    onChange={e => setFormData({ ...formData, initialCapital: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-base)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                            <button
                                onClick={() => setShowNewBacktest(false)}
                                style={{
                                    padding: 'var(--space-3) var(--space-5)',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-3) var(--space-5)',
                                    background: 'var(--brand-gradient)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <Play size={16} /> Run Backtest
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
