'use client';

/**
 * Settings Page
 * User profile, API keys, security, and preferences management
 */

import { useState } from 'react';

type SettingsTab = 'profile' | 'api-keys' | 'security' | 'notifications' | 'billing';

interface ApiKey {
    id: string;
    exchange: string;
    label: string;
    maskedKey: string;
    permissions: string[];
    isActive: boolean;
    lastUsed: string | null;
    createdAt: string;
}

const mockApiKeys: ApiKey[] = [
    {
        id: '1',
        exchange: 'binance',
        label: 'Main Trading Account',
        maskedKey: 'VmJk****...****8xQz',
        permissions: ['read', 'trade'],
        isActive: true,
        lastUsed: '2026-01-31T18:30:00Z',
        createdAt: '2026-01-10',
    },
    {
        id: '2',
        exchange: 'bybit',
        label: 'Test Account',
        maskedKey: 'Xy7n****...****2pLm',
        permissions: ['read'],
        isActive: true,
        lastUsed: null,
        createdAt: '2026-01-25',
    },
];

const exchangeIcons: Record<string, string> = {
    binance: '🟡',
    coinbase: '🔵',
    kraken: '🟣',
    bybit: '⚫',
    bitget: '🟢',
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
    const [showAddKeyModal, setShowAddKeyModal] = useState(false);

    const tabs: { id: SettingsTab; label: string; icon: string }[] = [
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'api-keys', label: 'API Keys', icon: '🔑' },
        { id: 'security', label: 'Security', icon: '🔐' },
        { id: 'notifications', label: 'Notifications', icon: '🔔' },
        { id: 'billing', label: 'Billing', icon: '💳' },
    ];

    return (
        <>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1 style={{ marginBottom: 'var(--space-2)' }}>Settings</h1>
                <p className="text-secondary">
                    Manage your account, security, and preferences
                </p>
            </header>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-1)',
                marginBottom: 'var(--space-6)',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 'var(--space-1)',
            }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3) var(--space-4)',
                            background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--brand-cyan)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            marginBottom: '-1px',
                            transition: 'all var(--transition-base)',
                        }}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ maxWidth: '800px' }}>
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="card" style={{ padding: 'var(--space-6)' }}>
                        <h3 style={{ marginBottom: 'var(--space-5)' }}>Profile Information</h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 'var(--space-4)',
                        }}>
                            <div>
                                <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    defaultValue="John"
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
                            <div>
                                <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    defaultValue="Trader"
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
                        </div>

                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: 'var(--space-2)' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                defaultValue="john@trader.com"
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

                        <button style={{
                            marginTop: 'var(--space-6)',
                            padding: 'var(--space-3) var(--space-5)',
                            background: 'var(--brand-gradient)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}>
                            Save Changes
                        </button>
                    </div>
                )}

                {/* API Keys Tab */}
                {activeTab === 'api-keys' && (
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-4)',
                        }}>
                            <div>
                                <h3>Exchange API Keys</h3>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    Connect your exchange accounts for automated trading
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddKeyModal(true)}
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
                                <span>+</span> Add API Key
                            </button>
                        </div>

                        {/* Warning Box */}
                        <div style={{
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                            background: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid rgba(250, 204, 21, 0.3)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                                <div>
                                    <strong style={{ color: '#facc15' }}>Security Notice</strong>
                                    <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 'var(--space-1)' }}>
                                        Only enable &quot;trade&quot; permission. Never enable &quot;withdraw&quot; for automated trading.
                                        Your API keys are encrypted with AES-256-GCM.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* API Keys List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {apiKeys.map((apiKey) => (
                                <div key={apiKey.id} className="card" style={{
                                    padding: 'var(--space-4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-4)',
                                }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                    }}>
                                        {exchangeIcons[apiKey.exchange] || '🔗'}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                                            <strong>{apiKey.label}</strong>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-full)',
                                                fontSize: '0.7rem',
                                                textTransform: 'uppercase',
                                                background: apiKey.isActive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                                                color: apiKey.isActive ? '#4ade80' : '#9ca3af',
                                            }}>
                                                {apiKey.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                            <span style={{ textTransform: 'capitalize' }}>{apiKey.exchange}</span>
                                            <span style={{ margin: '0 var(--space-2)' }}>•</span>
                                            <span style={{ fontFamily: 'var(--font-mono)' }}>{apiKey.maskedKey}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        {apiKey.permissions.map((perm) => (
                                            <span key={perm} style={{
                                                padding: '4px 8px',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-secondary)',
                                                textTransform: 'capitalize',
                                            }}>
                                                {perm}
                                            </span>
                                        ))}
                                    </div>

                                    <button style={{
                                        padding: 'var(--space-2) var(--space-3)',
                                        background: 'transparent',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}>
                                        Test
                                    </button>

                                    <button style={{
                                        padding: 'var(--space-2) var(--space-3)',
                                        background: 'rgba(248, 113, 113, 0.1)',
                                        border: '1px solid rgba(248, 113, 113, 0.3)',
                                        borderRadius: 'var(--radius-md)',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}>
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {/* 2FA Section */}
                        <div className="card" style={{ padding: 'var(--space-5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                    <span style={{ fontSize: '2rem' }}>🔐</span>
                                    <div>
                                        <h4 style={{ marginBottom: 'var(--space-1)' }}>Two-Factor Authentication</h4>
                                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                            Add an extra layer of security to your account
                                        </p>
                                    </div>
                                </div>
                                <button style={{
                                    padding: 'var(--space-2) var(--space-4)',
                                    background: 'var(--brand-gradient)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}>
                                    Enable 2FA
                                </button>
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="card" style={{ padding: 'var(--space-5)' }}>
                            <h4 style={{ marginBottom: 'var(--space-4)' }}>Change Password</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: 400 }}>
                                <input
                                    type="password"
                                    placeholder="Current password"
                                    style={{
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-base)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <input
                                    type="password"
                                    placeholder="New password"
                                    style={{
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-base)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm new password"
                                    style={{
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-base)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                    }}
                                />
                                <button style={{
                                    padding: 'var(--space-3)',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}>
                                    Update Password
                                </button>
                            </div>
                        </div>

                        {/* Sessions */}
                        <div className="card" style={{ padding: 'var(--space-5)' }}>
                            <h4 style={{ marginBottom: 'var(--space-4)' }}>Active Sessions</h4>
                            <div style={{
                                padding: 'var(--space-3)',
                                background: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>Current Session</div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        Chrome on Linux • IP: 192.168.1.1
                                    </div>
                                </div>
                                <span style={{
                                    padding: '4px 8px',
                                    background: 'rgba(74, 222, 128, 0.15)',
                                    borderRadius: 'var(--radius-full)',
                                    color: '#4ade80',
                                    fontSize: '0.75rem',
                                }}>
                                    Active Now
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                    <div className="card" style={{ padding: 'var(--space-5)' }}>
                        <h3 style={{ marginBottom: 'var(--space-5)' }}>Notification Preferences</h3>

                        {[
                            { id: 'trades', label: 'Trade Executions', desc: 'Get notified when trades are executed', enabled: true },
                            { id: 'signals', label: 'New Signals', desc: 'Receive alerts when new signals are generated', enabled: true },
                            { id: 'risk', label: 'Risk Alerts', desc: 'Get warnings when risk thresholds are exceeded', enabled: true },
                            { id: 'updates', label: 'Platform Updates', desc: 'Stay informed about new features', enabled: false },
                            { id: 'marketing', label: 'Marketing Emails', desc: 'Receive promotional content', enabled: false },
                        ].map((pref) => (
                            <div key={pref.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--space-4) 0',
                                borderBottom: '1px solid var(--border-subtle)',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500, marginBottom: 'var(--space-1)' }}>{pref.label}</div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>{pref.desc}</div>
                                </div>
                                <label style={{ position: 'relative', width: 48, height: 28, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        defaultChecked={pref.enabled}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: pref.enabled ? 'var(--brand-cyan)' : 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-full)',
                                        transition: 'background var(--transition-base)',
                                    }}>
                                        <span style={{
                                            position: 'absolute',
                                            top: 2,
                                            left: pref.enabled ? 22 : 2,
                                            width: 24,
                                            height: 24,
                                            background: 'white',
                                            borderRadius: '50%',
                                            transition: 'left var(--transition-base)',
                                        }} />
                                    </span>
                                </label>
                            </div>
                        ))}
                    </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {/* Current Plan */}
                        <div className="card" style={{
                            padding: 'var(--space-5)',
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            border: '1px solid var(--brand-cyan)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Current Plan</span>
                                    <h2 style={{ marginTop: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
                                        Free
                                    </h2>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem' }}>
                                        <li style={{ marginBottom: 'var(--space-1)' }}>✓ 2 strategies</li>
                                        <li style={{ marginBottom: 'var(--space-1)' }}>✓ 1 exchange connection</li>
                                        <li>✓ Basic signals</li>
                                    </ul>
                                </div>
                                <button style={{
                                    padding: 'var(--space-3) var(--space-5)',
                                    background: 'var(--brand-gradient)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
                                }}>
                                    Upgrade to Pro
                                </button>
                            </div>
                        </div>

                        {/* Upgrade Options */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 'var(--space-4)',
                        }}>
                            {[
                                { name: 'Starter', price: '$29', features: ['10 strategies', '5 exchanges', 'Email support'] },
                                { name: 'Pro', price: '$99', features: ['50 strategies', '20 exchanges', 'Priority support', 'Advanced ML signals'], popular: true },
                                { name: 'Enterprise', price: 'Custom', features: ['Unlimited', 'Dedicated support', 'Custom integrations', 'SLA guarantee'] },
                            ].map((plan) => (
                                <div key={plan.name} className="card" style={{
                                    padding: 'var(--space-5)',
                                    border: plan.popular ? '2px solid var(--brand-cyan)' : '1px solid var(--border-subtle)',
                                    position: 'relative',
                                }}>
                                    {plan.popular && (
                                        <div style={{
                                            position: 'absolute',
                                            top: -12,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            padding: '4px 12px',
                                            background: 'var(--brand-gradient)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                        }}>
                                            POPULAR
                                        </div>
                                    )}
                                    <h4 style={{ marginBottom: 'var(--space-2)' }}>{plan.name}</h4>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                                        {plan.price}<span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 400 }}>/mo</span>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem' }}>
                                        {plan.features.map((f) => (
                                            <li key={f} style={{ marginBottom: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                                                ✓ {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
