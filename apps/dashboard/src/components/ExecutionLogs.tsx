'use client';

/**
 * Execution Logs Panel
 * Real-time display of trading signals and executions
 */

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface LogEntry {
    id: string;
    timestamp: number;
    type: 'signal' | 'execution' | 'risk' | 'system';
    direction?: 'long' | 'short' | 'neutral';
    symbol: string;
    message: string;
    confidence?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface ExecutionLogsProps {
    logs: LogEntry[];
    maxEntries?: number;
}

export default function ExecutionLogs({ logs, maxEntries = 50 }: ExecutionLogsProps) {
    const displayLogs = logs.slice(0, maxEntries);

    const getIcon = (entry: LogEntry) => {
        if (entry.type === 'signal') {
            if (entry.direction === 'long') {
                return <TrendingUp size={16} className="text-success" />;
            } else if (entry.direction === 'short') {
                return <TrendingDown size={16} className="text-error" />;
            }
        }
        if (entry.type === 'risk') {
            return <AlertTriangle size={16} className="text-warning" />;
        }
        if (entry.type === 'execution') {
            return <CheckCircle size={16} className="text-accent" />;
        }
        return <Clock size={16} className="text-muted" />;
    };

    const getRiskBadge = (level?: string) => {
        if (!level) return null;
        const classes: Record<string, string> = {
            low: 'badge-success',
            medium: 'badge-warning',
            high: 'badge-error',
            critical: 'badge-error',
        };
        return <span className={`badge ${classes[level] || 'badge-info'}`}>{level}</span>;
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    };

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
                <h3>Execution Logs</h3>
                <span className="live-indicator">STREAMING</span>
            </div>

            <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
            }}>
                {displayLogs.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--text-muted)',
                    }}>
                        Waiting for events...
                    </div>
                ) : (
                    displayLogs.map((entry) => (
                        <div
                            key={entry.id}
                            className="animate-fade-in"
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 'var(--space-3)',
                                padding: 'var(--space-3)',
                                background: 'var(--bg-surface)',
                                borderRadius: 'var(--radius-md)',
                                borderLeft: `3px solid ${entry.type === 'signal'
                                        ? (entry.direction === 'long' ? 'var(--color-success)' : 'var(--color-error)')
                                        : entry.type === 'risk'
                                            ? 'var(--color-warning)'
                                            : 'var(--color-primary-500)'
                                    }`,
                            }}
                        >
                            <div style={{ marginTop: '2px' }}>
                                {getIcon(entry)}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    marginBottom: 'var(--space-1)',
                                }}>
                                    <span className="mono" style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {formatTime(entry.timestamp)}
                                    </span>
                                    <span className="badge badge-info">{entry.symbol}</span>
                                    {entry.confidence !== undefined && (
                                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {(entry.confidence * 100).toFixed(0)}% conf
                                        </span>
                                    )}
                                    {getRiskBadge(entry.riskLevel)}
                                </div>

                                <p style={{
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                    wordBreak: 'break-word',
                                }}>
                                    {entry.message}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
