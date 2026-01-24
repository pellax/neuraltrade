'use client';

/**
 * Statistics Cards Component
 * Displays key trading metrics
 */

import { TrendingUp, TrendingDown, Activity, Target, AlertTriangle, BarChart3 } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    prefix?: string;
    suffix?: string;
}

function StatCard({ label, value, change, icon, prefix = '', suffix = '' }: StatCardProps) {
    return (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--space-3)',
            }}>
                <span className="data-label">{label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                <span className="data-value mono">
                    {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                </span>
                {change !== undefined && (
                    <span
                        className={`mono ${change >= 0 ? 'text-success' : 'text-error'}`}
                        style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                        {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                )}
            </div>
        </div>
    );
}

interface StatsGridProps {
    stats: {
        totalPnL: number;
        totalPnLPercent: number;
        winRate: number;
        activeBots: number;
        openPositions: number;
        riskScore: number;
    };
}

export default function StatsGrid({ stats }: StatsGridProps) {
    return (
        <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-6)' }}>
            <StatCard
                label="Total P&L"
                value={Math.abs(stats.totalPnL).toFixed(2)}
                prefix={stats.totalPnL >= 0 ? '+$' : '-$'}
                change={stats.totalPnLPercent}
                icon={<BarChart3 size={18} />}
            />
            <StatCard
                label="Win Rate"
                value={stats.winRate.toFixed(1)}
                suffix="%"
                icon={<Target size={18} />}
            />
            <StatCard
                label="Active Bots"
                value={stats.activeBots}
                icon={<Activity size={18} />}
            />
            <StatCard
                label="Open Positions"
                value={stats.openPositions}
                icon={<TrendingUp size={18} />}
            />
            <StatCard
                label="Risk Score"
                value={stats.riskScore}
                suffix="/100"
                icon={<AlertTriangle size={18} />}
            />
            <StatCard
                label="Sharpe Ratio"
                value="1.85"
                icon={<BarChart3 size={18} />}
            />
        </div>
    );
}
