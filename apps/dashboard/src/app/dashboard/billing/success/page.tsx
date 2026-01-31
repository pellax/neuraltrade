'use client';

/**
 * Subscription Success Page
 * Shown after successful Stripe checkout
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Rocket, ArrowRight } from 'lucide-react';
import { isStripeTestMode } from '@/lib/stripe';
import { StripeTestModeBanner } from '@/components/StripeProvider';

export default function BillingSuccessPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate verification delay
        const timer = setTimeout(() => setLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <StripeTestModeBanner />

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 100px)',
                padding: 'var(--space-8)',
                textAlign: 'center',
            }}>
                {loading ? (
                    <div>
                        <div style={{
                            width: 64,
                            height: 64,
                            border: '4px solid var(--bg-elevated)',
                            borderTopColor: 'var(--brand-cyan)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto var(--space-6)',
                        }} />
                        <h2>Verifying your subscription...</h2>
                        <p className="text-muted">Please wait while we confirm your payment.</p>
                    </div>
                ) : (
                    <>
                        {/* Success Icon */}
                        <div style={{
                            width: 100,
                            height: 100,
                            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.2) 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 'var(--space-6)',
                        }}>
                            <CheckCircle size={48} color="#4ade80" />
                        </div>

                        {/* Title */}
                        <h1 style={{ marginBottom: 'var(--space-3)' }}>
                            🎉 Welcome to Pro!
                        </h1>
                        <p className="text-secondary" style={{
                            fontSize: '1.125rem',
                            maxWidth: 500,
                            marginBottom: 'var(--space-6)'
                        }}>
                            Your subscription is now active. You have access to all premium features.
                        </p>

                        {/* Test Mode Notice */}
                        {isStripeTestMode() && (
                            <div style={{
                                background: 'rgba(250, 204, 21, 0.1)',
                                border: '1px solid rgba(250, 204, 21, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-4)',
                                marginBottom: 'var(--space-6)',
                                maxWidth: 400,
                            }}>
                                <p style={{ color: '#facc15', fontSize: '0.875rem', margin: 0 }}>
                                    ⚠️ <strong>TEST MODE:</strong> This was a simulated payment.
                                    No real charges were made.
                                </p>
                            </div>
                        )}

                        {/* Features Unlocked */}
                        <div className="card" style={{
                            padding: 'var(--space-5)',
                            marginBottom: 'var(--space-6)',
                            maxWidth: 400,
                            width: '100%',
                        }}>
                            <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <Rocket size={20} color="var(--brand-cyan)" />
                                Features Unlocked
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                                {[
                                    '50 trading strategies',
                                    '20 exchange connections',
                                    'Premium ML signals',
                                    'Priority support',
                                    'Unlimited backtesting',
                                    'Full API access',
                                ].map((feature) => (
                                    <li key={feature} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        marginBottom: 'var(--space-2)',
                                        fontSize: '0.875rem',
                                        color: 'var(--text-secondary)',
                                    }}>
                                        <CheckCircle size={16} color="#4ade80" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Session ID for reference */}
                        {sessionId && (
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 'var(--space-6)' }}>
                                Session ID: <code>{sessionId.slice(0, 20)}...</code>
                            </p>
                        )}

                        {/* CTA Buttons */}
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <Link
                                href="/dashboard"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-3) var(--space-5)',
                                    background: 'var(--brand-gradient)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                }}
                            >
                                Go to Dashboard
                                <ArrowRight size={18} />
                            </Link>
                            <Link
                                href="/dashboard/bots"
                                style={{
                                    padding: 'var(--space-3) var(--space-5)',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)',
                                    textDecoration: 'none',
                                }}
                            >
                                Create Your First Bot
                            </Link>
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
