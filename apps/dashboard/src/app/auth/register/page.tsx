'use client';

/**
 * Registration Page
 * New user signup with password validation
 */

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (field === 'password') {
            // Calculate password strength
            let strength = 0;
            if (value.length >= 8) strength++;
            if (/[A-Z]/.test(value)) strength++;
            if (/[a-z]/.test(value)) strength++;
            if (/[0-9]/.test(value)) strength++;
            if (/[^A-Za-z0-9]/.test(value)) strength++;
            setPasswordStrength(strength);
        }
    };

    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (passwordStrength < 3) {
            setError('Password is too weak. Please use a stronger password.');
            return;
        }

        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            window.location.href = '/auth/login?registered=true';
        }, 1500);
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
                background: 'radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(6, 182, 212, 0.1) 0%, transparent 50%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                width: '100%',
                maxWidth: '480px',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: 'var(--space-6)'
                }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        margin: '0 auto var(--space-3)',
                        background: 'var(--brand-gradient)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.75rem',
                        boxShadow: '0 10px 40px rgba(6, 182, 212, 0.3)',
                    }}>
                        🧠
                    </div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        background: 'var(--brand-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: 'var(--space-2)',
                    }}>
                        Create Your Account
                    </h1>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                        Start trading with AI-powered strategies
                    </p>
                </div>

                {/* Registration Card */}
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

                        {/* Name Fields */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: 'var(--space-2)',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                }}>
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => updateField('firstName', e.target.value)}
                                    placeholder="John"
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
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: 'var(--space-2)',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                }}>
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => updateField('lastName', e.target.value)}
                                    placeholder="Doe"
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
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: 'var(--space-2)',
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                            }}>
                                Email <span style={{ color: 'var(--status-error)' }}>*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
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
                                }}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: 'var(--space-2)',
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                            }}>
                                Password <span style={{ color: 'var(--status-error)' }}>*</span>
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => updateField('password', e.target.value)}
                                placeholder="Create a strong password"
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
                            {/* Password Strength */}
                            {formData.password && (
                                <div style={{ marginTop: 'var(--space-2)' }}>
                                    <div style={{
                                        display: 'flex',
                                        gap: '4px',
                                        marginBottom: 'var(--space-1)',
                                    }}>
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div
                                                key={level}
                                                style={{
                                                    flex: 1,
                                                    height: 4,
                                                    borderRadius: 2,
                                                    background: passwordStrength >= level
                                                        ? strengthColors[passwordStrength - 1]
                                                        : 'var(--bg-elevated)',
                                                    transition: 'background var(--transition-base)',
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: strengthColors[passwordStrength - 1] || 'var(--text-muted)',
                                    }}>
                                        {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'Enter password'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div style={{ marginBottom: 'var(--space-5)' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: 'var(--space-2)',
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                            }}>
                                Confirm Password <span style={{ color: 'var(--status-error)' }}>*</span>
                            </label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => updateField('confirmPassword', e.target.value)}
                                placeholder="Confirm your password"
                                required
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-3)',
                                    background: 'var(--bg-base)',
                                    border: `1px solid ${formData.confirmPassword && formData.password !== formData.confirmPassword
                                            ? 'var(--status-error)'
                                            : 'var(--border-subtle)'
                                        }`,
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {/* Terms */}
                        <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-4)',
                            lineHeight: 1.5,
                        }}>
                            By creating an account, you agree to our{' '}
                            <a href="#" style={{ color: 'var(--brand-cyan)' }}>Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" style={{ color: 'var(--brand-cyan)' }}>Privacy Policy</a>.
                        </p>

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
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                </div>

                {/* Sign In Link */}
                <p style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-6)',
                    color: 'var(--text-muted)',
                }}>
                    Already have an account?{' '}
                    <Link href="/auth/login" style={{
                        color: 'var(--brand-cyan)',
                        textDecoration: 'none',
                        fontWeight: 500,
                    }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
