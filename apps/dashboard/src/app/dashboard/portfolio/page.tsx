'use client';

/**
 * Portfolio Page
 * Asset allocation, holdings, and performance tracking
 */

import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, PieChart, BarChart3, RefreshCw, Plus } from 'lucide-react';

interface Asset {
    symbol: string;
    name: string;
    balance: number;
    value: number;
    price: number;
    change24h: number;
    allocation: number;
    avgBuyPrice: number;
    pnl: number;
    pnlPercent: number;
}

interface Transaction {
    id: string;
    type: 'buy' | 'sell' | 'deposit' | 'withdraw';
    symbol: string;
    amount: number;
    price: number;
    total: number;
    timestamp: string;
    status: 'completed' | 'pending';
}

const mockAssets: Asset[] = [
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        balance: 0.5234,
        value: 22012.56,
        price: 42067.50,
        change24h: 2.34,
        allocation: 42.5,
        avgBuyPrice: 38500,
        pnl: 1868.45,
        pnlPercent: 9.27,
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: 8.245,
        value: 20284.70,
        price: 2460.50,
        change24h: -1.23,
        allocation: 39.2,
        avgBuyPrice: 2200,
        pnl: 2148.80,
        pnlPercent: 11.84,
    },
    {
        symbol: 'SOL',
        name: 'Solana',
        balance: 52.5,
        value: 5092.50,
        price: 97.00,
        change24h: 5.67,
        allocation: 9.8,
        avgBuyPrice: 85,
        pnl: 630.00,
        pnlPercent: 14.12,
    },
    {
        symbol: 'USDT',
        name: 'Tether',
        balance: 4420.50,
        value: 4420.50,
        price: 1.00,
        change24h: 0.01,
        allocation: 8.5,
        avgBuyPrice: 1.00,
        pnl: 0,
        pnlPercent: 0,
    },
];

const mockTransactions: Transaction[] = [
    { id: '1', type: 'buy', symbol: 'BTC', amount: 0.15, price: 41500, total: 6225, timestamp: '2026-01-31T18:30:00Z', status: 'completed' },
    { id: '2', type: 'sell', symbol: 'ETH', amount: 2.5, price: 2480, total: 6200, timestamp: '2026-01-31T15:20:00Z', status: 'completed' },
    { id: '3', type: 'buy', symbol: 'SOL', amount: 25, price: 95, total: 2375, timestamp: '2026-01-30T12:00:00Z', status: 'completed' },
    { id: '4', type: 'deposit', symbol: 'USDT', amount: 5000, price: 1, total: 5000, timestamp: '2026-01-29T10:00:00Z', status: 'completed' },
];

const assetColors: Record<string, string> = {
    BTC: '#f7931a',
    ETH: '#627eea',
    SOL: '#14f195',
    USDT: '#26a17b',
    AVAX: '#e84142',
    LINK: '#2a5ada',
};

export default function PortfolioPage() {
    const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
    const [showDepositModal, setShowDepositModal] = useState(false);

    const totalValue = mockAssets.reduce((sum, a) => sum + a.value, 0);
    const totalPnL = mockAssets.reduce((sum, a) => sum + a.pnl, 0);
    const totalPnLPercent = (totalPnL / (totalValue - totalPnL)) * 100;

    const performanceData = {
        '24h': { change: 1.23, value: 510 },
        '7d': { change: 8.45, value: 3850 },
        '30d': { change: 15.67, value: 6920 },
        'all': { change: 45.23, value: 15250 },
    };

    return (
        <>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Portfolio</h1>
                    <p className="text-secondary">Track your holdings and performance</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
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
                        <RefreshCw size={18} /> Sync
                    </button>
                    <button
                        onClick={() => setShowDepositModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-4)',
                            background: 'var(--brand-gradient)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={18} /> Deposit
                    </button>
                </div>
            </header>

            {/* Portfolio Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {/* Total Value Card */}
                <div className="card" style={{ padding: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            background: 'var(--brand-gradient)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Wallet size={24} color="white" />
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Total Portfolio Value</div>
                            <div style={{ fontSize: '2rem', fontWeight: 700 }}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>Total P&L</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: totalPnL >= 0 ? '#4ade80' : '#f87171' }}>
                                {totalPnL >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                <span style={{ fontSize: '0.875rem' }}>({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Card */}
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h3>Performance</h3>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                            {(['24h', '7d', '30d', 'all'] as const).map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    style={{
                                        padding: 'var(--space-1) var(--space-2)',
                                        background: timeframe === tf ? 'var(--bg-elevated)' : 'transparent',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        color: timeframe === tf ? 'var(--text-primary)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                        <span style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: performanceData[timeframe].change >= 0 ? '#4ade80' : '#f87171',
                        }}>
                            {performanceData[timeframe].change >= 0 ? '+' : ''}{performanceData[timeframe].change}%
                        </span>
                        <span className="text-muted" style={{ fontSize: '1rem' }}>
                            ${performanceData[timeframe].value.toLocaleString()}
                        </span>
                    </div>
                    {/* Simple chart placeholder */}
                    <div style={{ height: 80, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BarChart3 size={32} className="text-muted" />
                    </div>
                </div>
            </div>

            {/* Asset Allocation */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {/* Allocation Chart */}
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Allocation</h3>
                    {/* Pie Chart Placeholder */}
                    <div style={{
                        width: 200,
                        height: 200,
                        margin: '0 auto var(--space-4)',
                        borderRadius: '50%',
                        background: `conic-gradient(
                            ${assetColors.BTC} 0deg ${mockAssets[0].allocation * 3.6}deg,
                            ${assetColors.ETH} ${mockAssets[0].allocation * 3.6}deg ${(mockAssets[0].allocation + mockAssets[1].allocation) * 3.6}deg,
                            ${assetColors.SOL} ${(mockAssets[0].allocation + mockAssets[1].allocation) * 3.6}deg ${(mockAssets[0].allocation + mockAssets[1].allocation + mockAssets[2].allocation) * 3.6}deg,
                            ${assetColors.USDT} ${(mockAssets[0].allocation + mockAssets[1].allocation + mockAssets[2].allocation) * 3.6}deg 360deg
                        )`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <div style={{
                            width: 120,
                            height: 120,
                            background: 'var(--bg-surface)',
                            borderRadius: '50%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <div style={{ fontSize: '0.75rem' }} className="text-muted">Assets</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{mockAssets.length}</div>
                        </div>
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {mockAssets.map(asset => (
                            <div key={asset.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: assetColors[asset.symbol] || '#9ca3af' }} />
                                    <span style={{ fontSize: '0.875rem' }}>{asset.symbol}</span>
                                </div>
                                <span className="text-muted" style={{ fontSize: '0.875rem' }}>{asset.allocation.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Holdings Table */}
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Holdings</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <th style={{ textAlign: 'left', padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>Asset</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>Balance</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>Price</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>24h</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>Value</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockAssets.map(asset => (
                                <tr key={asset.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '50%',
                                                background: assetColors[asset.symbol] || '#9ca3af',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                            }}>
                                                {asset.symbol.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{asset.symbol}</div>
                                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{asset.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                        {asset.balance.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', color: asset.change24h >= 0 ? '#4ade80' : '#f87171' }}>
                                        {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600 }}>
                                        ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                        <div style={{ color: asset.pnl >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                                            {asset.pnl >= 0 ? '+' : ''}${asset.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {asset.pnlPercent >= 0 ? '+' : ''}{asset.pnlPercent.toFixed(2)}%
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
                <h3 style={{ marginBottom: 'var(--space-4)' }}>Recent Transactions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {mockTransactions.map(tx => (
                        <div
                            key={tx.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--space-3)',
                                background: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 'var(--radius-md)',
                                    background: tx.type === 'buy' || tx.type === 'deposit' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: tx.type === 'buy' || tx.type === 'deposit' ? '#4ade80' : '#f87171',
                                }}>
                                    {tx.type === 'buy' || tx.type === 'deposit' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{tx.type} {tx.symbol}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, color: tx.type === 'buy' || tx.type === 'deposit' ? '#4ade80' : '#f87171' }}>
                                    {tx.type === 'buy' || tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.symbol}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    ${tx.total.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
