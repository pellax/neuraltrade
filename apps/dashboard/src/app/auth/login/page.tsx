'use client';

/**
 * Login Page
 * Professional login form with 2FA support - Connected to API
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Shield, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const redirectTo = searchParams.get('redirect') || '/dashboard';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const result = await login(email, password, showTwoFactor ? twoFactorCode : undefined);

        if (result.success) {
            // Set cookie for middleware
            document.cookie = `accessToken=${localStorage.getItem('accessToken')}; path=/; max-age=${60 * 60 * 24 * 7}`;
            router.push(redirectTo);
        } else if (result.requires2fa) {
            setShowTwoFactor(true);
            setIsLoading(false);
        } else {
            setError(result.error || 'Login failed');
            setIsLoading(false);
        }
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
                        {showTwoFactor ? 'Enter your 2FA code' : 'Sign in to your account'}
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
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{
                                            position: 'absolute',
                                            left: 12,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'var(--text-muted)',
                                        }} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            required
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-3)',
                                                paddingLeft: 42,
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
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{
                                            position: 'absolute',
                                            left: 12,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'var(--text-muted)',
                                        }} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-3)',
                                                paddingLeft: 42,
                                                background: 'var(--bg-base)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'var(--text-primary)',
                                                fontSize: '1rem',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
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
                                        width: 60,
                                        height: 60,
                                        margin: '0 auto var(--space-3)',
                                        background: 'var(--brand-gradient)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Shield size={28} color="white" />
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
                                    autoFocus
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
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTwoFactor(false);
                                        setTwoFactorCode('');
                                    }}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: 'var(--space-3)',
                                        padding: 'var(--space-2)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ← Back to login
                                </button>
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
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                    Signing in...
                                </>
                            ) : (
                                showTwoFactor ? 'Verify' : 'Sign In'
                            )}
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

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
