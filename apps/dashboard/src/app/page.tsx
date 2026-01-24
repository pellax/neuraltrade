'use client';

/**
 * NeuralTrade Dashboard - Main Page
 * Real-time trading dashboard with charts and execution logs
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import StatsGrid from '@/components/StatsGrid';
import ExecutionLogs from '@/components/ExecutionLogs';

// Dynamic import for chart (client-only)
const TradingChart = dynamic(() => import('@/components/TradingChart'), {
    ssr: false,
    loading: () => (
        <div className="card" style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-muted">Loading chart...</span>
        </div>
    ),
});

// Mock data generator
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

function generateMockLogs(): any[] {
    const types = ['signal', 'execution', 'risk', 'system'] as const;
    const directions = ['long', 'short', 'neutral'] as const;
    const riskLevels = ['low', 'medium', 'high'] as const;
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
    const messages = [
        'Signal generated: RSI oversold + MACD crossover',
        'Position opened at market price',
        'Risk assessment: Volatility above threshold',
        'Take profit level 1 reached',
        'Stop loss adjusted to breakeven',
        'Model confidence above 90%',
        'Shadow model agreement confirmed',
    ];

    return Array.from({ length: 20 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: Date.now() - i * 30000,
        type: types[Math.floor(Math.random() * types.length)],
        direction: directions[Math.floor(Math.random() * directions.length)],
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        confidence: Math.random() * 0.3 + 0.7,
        riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
    }));
}

export default function DashboardPage() {
    const [currentRoute, setCurrentRoute] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [candles, setCandles] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    const stats = {
        totalPnL: 15420.50,
        totalPnLPercent: 8.45,
        winRate: 67.3,
        activeBots: 3,
        openPositions: 5,
        riskScore: 42,
    };

    // Load mock data
    useEffect(() => {
        setCandles(generateMockCandles(200));
        setLogs(generateMockLogs());

        // Simulate real-time updates
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
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />

            <main
                style={{
                    flex: 1,
                    marginLeft: sidebarCollapsed ? '64px' : '240px',
                    padding: 'var(--space-6)',
                    transition: 'margin-left var(--transition-base)',
                }}
            >
                {/* Header */}
                <header style={{ marginBottom: 'var(--space-6)' }}>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Dashboard</h1>
                    <p className="text-secondary">
                        Real-time overview of your trading activity
                    </p>
                </header>

                {/* Stats Grid */}
                <StatsGrid stats={stats} />

                {/* Main Content Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 400px',
                        gap: 'var(--space-6)',
                        alignItems: 'start',
                    }}
                >
                    {/* Chart */}
                    <TradingChart
                        symbol="BTC/USDT"
                        data={candles}
                        height={400}
                    />

                    {/* Execution Logs */}
                    <div style={{ height: 500 }}>
                        <ExecutionLogs logs={logs} />
                    </div>
                </div>

                {/* Keyboard Shortcuts Help */}
                <div
                    style={{
                        marginTop: 'var(--space-8)',
                        padding: 'var(--space-4)',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                        Keyboard Shortcuts
                    </h4>
                    <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                        {[
                            { key: '⌥1-6', action: 'Navigate sections' },
                            { key: '⌥0', action: 'Settings' },
                            { key: '[', action: 'Toggle sidebar' },
                            { key: 'Esc', action: 'Close modal' },
                        ].map(({ key, action }) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <kbd style={{
                                    padding: '4px 8px',
                                    background: 'var(--bg-base)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-subtle)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                }}>
                                    {key}
                                </kbd>
                                <span className="text-muted" style={{ fontSize: '0.875rem' }}>{action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
