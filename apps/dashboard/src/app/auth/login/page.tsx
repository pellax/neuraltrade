'use client';

/**
 * Login Page
 * Professional login form with 2FA support
 */

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulate API call
        setTimeout(() => {
            // For demo, show 2FA if email contains "2fa"
            if (email.includes('2fa') && !showTwoFactor) {
                setShowTwoFactor(true);
                setIsLoading(false);
                return;
            }

            // Simulate successful login
            window.location.href = '/';
        }, 1000);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-base)',
            padding: 'var(--space-4)',
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(ellipse at top right, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                width: '100%',
                maxWidth: '420px',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: 'var(--space-8)'
                }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        margin: '0 auto var(--space-4)',
                        background: 'var(--brand-gradient)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        boxShadow: '0 10px 40px rgba(6, 182, 212, 0.3)',
                    }}>
                        🧠
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        background: 'var(--brand-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: 'var(--space-2)',
                    }}>
                        NeuralTrade
                    </h1>
                    <p className="text-muted">
                        Sign in to your account
                    </p>
                </div>

                {/* Login Card */}
                <div className="card" style={{
                    padding: 'var(--space-6)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-subtle)',
                }}>
                    <form onSubmit={handleSubmit}>
                        {/* Error Message */}
                        {error && (
                            <div style={{
                                padding: 'var(--space-3)',
                                marginBottom: 'var(--space-4)',
                                background: 'rgba(248, 113, 113, 0.15)',
                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                color: '#f87171',
                                fontSize: '0.875rem',
                            }}>
                                {error}
                            </div>
                        )}

                        {!showTwoFactor ? (
                            <>
                                {/* Email */}
                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: 'var(--space-2)',
                                        fontSize: '0.875rem',
                                        color: 'var(--text-secondary)',
                                    }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'border-color var(--transition-base)',
                                        }}
                                    />
                                </div>

                                {/* Password */}
                                <div style={{ marginBottom: 'var(--space-5)' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 'var(--space-2)',
                                    }}>
                                        <label style={{
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                        }}>
                                            Password
                                        </label>
                                        <Link href="/auth/forgot-password" style={{
                                            fontSize: '0.875rem',
                                            color: 'var(--brand-cyan)',
                                            textDecoration: 'none',
                                        }}>
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            background: 'var(--bg-base)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1rem',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            /* 2FA Input */
                            <div style={{ marginBottom: 'var(--space-5)' }}>
                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: 'var(--space-4)',
                                }}>
                                    <div style={{
                                        fontSize: '2rem',
                                        marginBottom: 'var(--space-2)',
                                    }}>
                                        🔐
                                    </div>
                                    <h3 style={{ marginBottom: 'var(--space-2)' }}>
                                        Two-Factor Authentication
                                    </h3>
                                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        Enter the 6-digit code from your authenticator app
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    maxLength={6}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-4)',
                                        background: 'var(--bg-base)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.5rem',
                                        fontFamily: 'var(--font-mono)',
                                        textAlign: 'center',
                                        letterSpacing: '0.5em',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: 'var(--space-3)',
                                background: isLoading ? 'var(--bg-elevated)' : 'var(--brand-gradient)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'all var(--transition-base)',
                                boxShadow: isLoading ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.3)',
                            }}
                        >
                            {isLoading ? 'Signing in...' : (showTwoFactor ? 'Verify' : 'Sign In')}
                        </button>
                    </form>
                </div>

                {/* Sign Up Link */}
                <p style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-6)',
                    color: 'var(--text-muted)',
                }}>
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/register" style={{
                        color: 'var(--brand-cyan)',
                        textDecoration: 'none',
                        fontWeight: 500,
                    }}>
                        Create one
                    </Link>
                </p>

                {/* Footer */}
                <p style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-8)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                }}>
                    © 2026 NeuralTrade. AI-Powered Trading Platform.
                </p>
            </div>
        </div>
    );
}
