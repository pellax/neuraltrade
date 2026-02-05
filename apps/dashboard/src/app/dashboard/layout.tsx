'use client';

/**
 * Dashboard Layout
 * Shared layout for authenticated dashboard pages with sidebar navigation
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
    LogOut,
    CreditCard,
    User,
} from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    shortcut: string;
    href: string;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout, isLoading } = useAuth();

    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, shortcut: '1', href: '/dashboard' },
        { id: 'trading', label: 'Trading', icon: <LineChart size={20} />, shortcut: '2', href: '/dashboard/trading' },
        { id: 'bots', label: 'Bots', icon: <Bot size={20} />, shortcut: '3', href: '/dashboard/bots' },
        { id: 'backtest', label: 'Backtest', icon: <History size={20} />, shortcut: '4', href: '/dashboard/backtest' },
        { id: 'signals', label: 'Signals', icon: <Activity size={20} />, shortcut: '5', href: '/dashboard/signals' },
        { id: 'portfolio', label: 'Portfolio', icon: <Wallet size={20} />, shortcut: '6', href: '/dashboard/portfolio' },
        { id: 'pricing', label: 'Pricing', icon: <CreditCard size={20} />, shortcut: '7', href: '/dashboard/pricing' },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} />, shortcut: '0', href: '/dashboard/settings' },
    ];

    // Check if current route matches nav item
    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname?.startsWith(href);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.altKey) {
                const item = navItems.find(n => n.shortcut === e.key);
                if (item) {
                    e.preventDefault();
                    window.location.href = item.href;
                }
            }

            if (e.key === '[') {
                setCollapsed(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLogout = async () => {
        // Also clear cookie
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        await logout();
    };

    // Show loading state
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--bg-base)',
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid var(--bg-elevated)',
                    borderTopColor: 'var(--brand-cyan)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
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
                                <Link
                                    href={item.href}
                                    title={`${item.label} (Alt+${item.shortcut})`}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                        padding: collapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
                                        background: isActive(item.href) ? 'var(--bg-hover)' : 'transparent',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        color: isActive(item.href) ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)',
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <span style={{
                                        color: isActive(item.href) ? 'var(--color-primary-400)' : 'inherit'
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
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        margin: 'var(--space-2) var(--space-4)',
                        padding: collapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
                        background: 'transparent',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#f87171',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: 'var(--space-3)',
                        fontSize: '0.875rem',
                    }}
                >
                    <LogOut size={18} />
                    {!collapsed && 'Logout'}
                </button>

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

            {/* Main Content */}
            <main
                style={{
                    flex: 1,
                    marginLeft: collapsed ? '64px' : '240px',
                    padding: 'var(--space-6)',
                    transition: 'margin-left var(--transition-base)',
                    minHeight: '100vh',
                }}
            >
                {children}
            </main>
        </div>
    );
}
