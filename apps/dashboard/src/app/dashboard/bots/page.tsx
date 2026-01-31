'use client';

/**
 * Bots Page
 * Manage automated trading bots and strategies
 */

import { useState } from 'react';
import { Bot, Play, Pause, Settings, Trash2, Plus, TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface TradingBot {
    id: string;
    name: string;
    strategy: string;
    status: 'running' | 'paused' | 'stopped' | 'error';
    exchange: string;
    symbol: string;
    pnl: number;
    pnlPercent: number;
    trades: number;
    winRate: number;
    riskLevel: 'low' | 'medium' | 'high';
    createdAt: string;
    lastTrade: string | null;
}

const mockBots: TradingBot[] = [
    {
        id: '1',
        name: 'Alpha Momentum',
        strategy: 'RSI + MACD Crossover',
        status: 'running',
        exchange: 'Binance',
        symbol: 'BTC/USDT',
        pnl: 2450.00,
        pnlPercent: 12.5,
        trades: 156,
        winRate: 68.2,
        riskLevel: 'medium',
        createdAt: '2026-01-15',
        lastTrade: '2026-01-31T19:30:00Z',
    },
    {
        id: '2',
        name: 'ETH Scalper',
        strategy: 'Bollinger Bands Breakout',
        status: 'running',
        exchange: 'Bybit',
        symbol: 'ETH/USDT',
        pnl: 890.50,
        pnlPercent: 8.3,
        trades: 423,
        winRate: 54.1,
        riskLevel: 'high',
        createdAt: '2026-01-20',
        lastTrade: '2026-01-31T19:45:00Z',
    },
    {
        id: '3',
        name: 'SOL DCA Bot',
        strategy: 'Dollar Cost Averaging',
        status: 'paused',
        exchange: 'Binance',
        symbol: 'SOL/USDT',
        pnl: -150.00,
        pnlPercent: -3.2,
        trades: 24,
        winRate: 45.8,
        riskLevel: 'low',
        createdAt: '2026-01-25',
        lastTrade: '2026-01-30T12:00:00Z',
    },
    {
        id: '4',
        name: 'Trend Follower',
        strategy: 'Moving Average Crossover',
        status: 'error',
        exchange: 'Coinbase',
        symbol: 'AVAX/USDT',
        pnl: 0,
        pnlPercent: 0,
        trades: 0,
        winRate: 0,
        riskLevel: 'medium',
        createdAt: '2026-01-28',
        lastTrade: null,
    },
];

const strategies = [
    { id: 'rsi-macd', name: 'RSI + MACD Crossover', description: 'Combines RSI oversold/overbought with MACD signal crossovers' },
    { id: 'bb-breakout', name: 'Bollinger Bands Breakout', description: 'Trades breakouts from Bollinger Band channels' },
    { id: 'ma-cross', name: 'Moving Average Crossover', description: 'Golden/death cross strategy with EMA 20/50' },
    { id: 'dca', name: 'Dollar Cost Averaging', description: 'Systematic buying at regular intervals' },
    { id: 'grid', name: 'Grid Trading', description: 'Places buy/sell orders at preset intervals' },
    { id: 'ml-signal', name: 'ML Signal Follower', description: 'Follows AI-generated trading signals' },
];

export default function BotsPage() {
    const [bots, setBots] = useState(mockBots);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

    const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        running: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80', icon: <Activity size={14} /> },
        paused: { bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15', icon: <Pause size={14} /> },
        stopped: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', icon: <CheckCircle size={14} /> },
        error: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171', icon: <AlertTriangle size={14} /> },
    };

    const riskColors: Record<string, string> = {
        low: '#4ade80',
        medium: '#facc15',
        high: '#f87171',
    };

    const toggleBot = (id: string) => {
        setBots(prev => prev.map(bot => {
            if (bot.id === id) {
                return { ...bot, status: bot.status === 'running' ? 'paused' : 'running' };
            }
            return bot;
        }));
    };

    const stats = {
        totalBots: bots.length,
        activeBots: bots.filter(b => b.status === 'running').length,
        totalPnL: bots.reduce((sum, b) => sum + b.pnl, 0),
        avgWinRate: bots.filter(b => b.trades > 0).reduce((sum, b) => sum + b.winRate, 0) / bots.filter(b => b.trades > 0).length || 0,
    };

    return (
        <>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Trading Bots</h1>
                    <p className="text-secondary">Manage your automated trading strategies</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
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
                    <Plus size={20} /> Create Bot
                </button>
            </header>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Total Bots</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalBots}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Active Bots</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>{stats.activeBots}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Total P&L</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.totalPnL >= 0 ? '#4ade80' : '#f87171' }}>
                        {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                    </div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Avg Win Rate</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.avgWinRate.toFixed(1)}%</div>
                </div>
            </div>

            {/* Bots Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
                {bots.map(bot => (
                    <div key={bot.id} className="card" style={{ padding: 'var(--space-5)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    background: 'var(--brand-gradient)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Bot size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ marginBottom: 'var(--space-1)' }}>{bot.name}</h3>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>{bot.strategy}</div>
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-1)',
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-full)',
                                background: statusColors[bot.status].bg,
                                color: statusColors[bot.status].text,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                textTransform: 'capitalize',
                            }}>
                                {statusColors[bot.status].icon}
                                {bot.status}
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>P&L</div>
                                <div style={{ fontWeight: 600, color: bot.pnl >= 0 ? '#4ade80' : '#f87171' }}>
                                    {bot.pnl >= 0 ? '+' : ''}${bot.pnl.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>ROI</div>
                                <div style={{ fontWeight: 600, color: bot.pnlPercent >= 0 ? '#4ade80' : '#f87171' }}>
                                    {bot.pnlPercent >= 0 ? '+' : ''}{bot.pnlPercent.toFixed(1)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Trades</div>
                                <div style={{ fontWeight: 600 }}>{bot.trades}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Win Rate</div>
                                <div style={{ fontWeight: 600 }}>{bot.winRate.toFixed(1)}%</div>
                            </div>
                        </div>

                        {/* Info Row */}
                        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
                            <div className="text-muted">
                                <span style={{ marginRight: 'var(--space-1)' }}>📈</span> {bot.symbol}
                            </div>
                            <div className="text-muted">
                                <span style={{ marginRight: 'var(--space-1)' }}>🏦</span> {bot.exchange}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColors[bot.riskLevel] }} />
                                <span className="text-muted" style={{ textTransform: 'capitalize' }}>{bot.riskLevel} risk</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                onClick={() => toggleBot(bot.id)}
                                disabled={bot.status === 'error'}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-3)',
                                    background: bot.status === 'running' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                                    border: `1px solid ${bot.status === 'running' ? 'rgba(250, 204, 21, 0.3)' : 'rgba(74, 222, 128, 0.3)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    color: bot.status === 'running' ? '#facc15' : '#4ade80',
                                    cursor: bot.status === 'error' ? 'not-allowed' : 'pointer',
                                    fontWeight: 500,
                                    opacity: bot.status === 'error' ? 0.5 : 1,
                                }}
                            >
                                {bot.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
                                {bot.status === 'running' ? 'Pause' : 'Start'}
                            </button>
                            <button style={{
                                padding: 'var(--space-3)',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                            }}>
                                <Settings size={16} />
                            </button>
                            <button style={{
                                padding: 'var(--space-3)',
                                background: 'rgba(248, 113, 113, 0.1)',
                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                color: '#f87171',
                                cursor: 'pointer',
                            }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Bot Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }} onClick={() => setShowCreateModal(false)}>
                    <div className="card" style={{
                        width: '100%',
                        maxWidth: 600,
                        padding: 'var(--space-6)',
                        maxHeight: '80vh',
                        overflow: 'auto',
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: 'var(--space-4)' }}>Create New Bot</h2>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                Bot Name
                            </label>
                            <input
                                type="text"
                                placeholder="My Trading Bot"
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

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                Select Strategy
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
                                {strategies.map(strategy => (
                                    <button
                                        key={strategy.id}
                                        onClick={() => setSelectedStrategy(strategy.id)}
                                        style={{
                                            padding: 'var(--space-3)',
                                            background: selectedStrategy === strategy.id ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-elevated)',
                                            border: `1px solid ${selectedStrategy === strategy.id ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-primary)' }}>
                                            {strategy.name}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {strategy.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowCreateModal(false)}
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
                                    padding: 'var(--space-3) var(--space-5)',
                                    background: 'var(--brand-gradient)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Create Bot
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
