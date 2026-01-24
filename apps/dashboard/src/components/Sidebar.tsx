'use client';

/**
 * Sidebar Navigation
 * Main navigation with keyboard shortcuts
 */

import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    LineChart,
    Bot,
    Settings,
    History,
    Wallet,
    Activity,
    ChevronLeft,
    ChevronRight,
    Zap,
} from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    shortcut: string;
    active?: boolean;
}

interface SidebarProps {
    currentRoute: string;
    onNavigate: (route: string) => void;
}

export default function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);

    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, shortcut: '1' },
        { id: 'trading', label: 'Trading', icon: <LineChart size={20} />, shortcut: '2' },
        { id: 'bots', label: 'Bots', icon: <Bot size={20} />, shortcut: '3' },
        { id: 'backtest', label: 'Backtest', icon: <History size={20} />, shortcut: '4' },
        { id: 'signals', label: 'Signals', icon: <Activity size={20} />, shortcut: '5' },
        { id: 'portfolio', label: 'Portfolio', icon: <Wallet size={20} />, shortcut: '6' },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} />, shortcut: '0' },
    ];

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Use Alt + number for navigation
            if (e.altKey) {
                const item = navItems.find(n => n.shortcut === e.key);
                if (item) {
                    e.preventDefault();
                    onNavigate(item.id);
                }
            }

            // Toggle sidebar with [
            if (e.key === '[') {
                setCollapsed(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNavigate]);

    return (
        <aside
            style={{
                width: collapsed ? '64px' : '240px',
                height: '100vh',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width var(--transition-base)',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 100,
            }}
        >
            {/* Logo */}
            <div
                style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Zap size={18} color="white" />
                </div>
                {!collapsed && (
                    <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                        NeuralTrade
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: 'var(--space-4)' }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onNavigate(item.id)}
                                title={`${item.label} (Alt+${item.shortcut})`}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    padding: collapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
                                    background: currentRoute === item.id ? 'var(--bg-hover)' : 'transparent',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: currentRoute === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                }}
                            >
                                <span style={{
                                    color: currentRoute === item.id ? 'var(--color-primary-400)' : 'inherit'
                                }}>
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                                        <kbd
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '2px 6px',
                                                background: 'var(--bg-base)',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--text-muted)',
                                                border: '1px solid var(--border-subtle)',
                                            }}
                                        >
                                            ⌥{item.shortcut}
                                        </kbd>
                                    </>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                title="Toggle sidebar ([)"
                style={{
                    margin: 'var(--space-4)',
                    padding: 'var(--space-2)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
        </aside>
    );
}
