'use client';

/**
 * Checkout Page
 * Integrated Stripe payment form for subscriptions
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    CardElement,
    Elements,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { ArrowLeft, Shield, Check, CreditCard, Lock } from 'lucide-react';
import { getStripe, PRICING_PLANS, PlanId, isStripeTestMode, TEST_CARDS } from '@/lib/stripe';
import { StripeTestModeBanner } from '@/components/StripeProvider';

// Stripe Elements options
const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: '16px',
            color: '#e4e4e7',
            fontFamily: 'Inter, system-ui, sans-serif',
            '::placeholder': {
                color: '#71717a',
            },
            iconColor: '#06b6d4',
        },
        invalid: {
            color: '#f87171',
            iconColor: '#f87171',
        },
    },
    hidePostalCode: false,
};

function CheckoutForm({ planId }: { planId: PlanId }) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');

    const plan = PRICING_PLANS[planId];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            setError('Stripe is not loaded. Please refresh the page.');
            return;
        }

        if (!email || !name) {
            setError('Please fill in all fields.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Create payment intent on the server
            const response = await fetch('/api/stripe/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: plan.priceId,
                    email,
                    name,
                }),
            });

            const data = await response.json();
            console.log('[Checkout] API Response:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.clientSecret) {
                throw new Error('No client secret received from server. Please check API configuration.');
            }

            // Confirm the payment
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) {
                throw new Error('Card element not found');
            }

            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                data.clientSecret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name,
                            email,
                        },
                    },
                }
            );

            if (stripeError) {
                throw new Error(stripeError.message);
            }

            if (paymentIntent?.status === 'succeeded') {
                router.push('/dashboard/billing/success?plan=' + planId);
            } else if (paymentIntent?.status === 'requires_action') {
                // 3D Secure or other authentication required
                setError('Additional authentication required. Please follow the prompts.');
            }
        } catch (err: any) {
            console.error('[Checkout] Error:', err);
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Email Field */}
            <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Email Address
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{
                        width: '100%',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color var(--transition-fast)',
                    }}
                />
            </div>

            {/* Name Field */}
            <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Cardholder Name
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    style={{
                        width: '100%',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        outline: 'none',
                    }}
                />
            </div>

            {/* Card Element */}
            <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Card Details
                </label>
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'rgba(248, 113, 113, 0.1)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f87171',
                    fontSize: '0.875rem',
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                style={{
                    width: '100%',
                    padding: 'var(--space-4)',
                    background: isProcessing
                        ? 'var(--bg-elevated)'
                        : 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #d946ef 100%)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                    boxShadow: isProcessing ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.3)',
                    transition: 'all var(--transition-base)',
                }}
            >
                {isProcessing ? (
                    <>
                        <div style={{
                            width: 20,
                            height: 20,
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                        Processing...
                    </>
                ) : (
                    <>
                        <Lock size={18} />
                        Subscribe for ${plan.price}/mo
                    </>
                )}
            </button>

            {/* Security Note */}
            <p style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
            }}>
                <Shield size={14} />
                Secured by Stripe. Your card info is encrypted.
            </p>

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </form>
    );
}

export default function CheckoutPage() {
    const searchParams = useSearchParams();
    const planId = (searchParams.get('plan')?.toUpperCase() || 'PRO') as PlanId;
    const plan = PRICING_PLANS[planId];
    const [stripePromise] = useState(() => getStripe());

    if (!plan || plan.price === null || plan.price === 0) {
        return (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <h2>Invalid Plan</h2>
                <p className="text-muted">Please select a valid subscription plan.</p>
                <Link href="/dashboard/pricing" style={{ color: 'var(--brand-cyan)' }}>
                    ← Back to Pricing
                </Link>
            </div>
        );
    }

    return (
        <>
            <StripeTestModeBanner />

            <div style={{
                maxWidth: 900,
                margin: '0 auto',
                padding: 'var(--space-6)',
                display: 'grid',
                gridTemplateColumns: '1fr 400px',
                gap: 'var(--space-8)',
                alignItems: 'start',
            }}>
                {/* Left Column - Order Summary */}
                <div>
                    <Link
                        href="/dashboard/pricing"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            marginBottom: 'var(--space-6)',
                            fontSize: '0.875rem',
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back to pricing
                    </Link>

                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Complete your subscription</h1>
                    <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
                        You&apos;re subscribing to {plan.name}
                    </p>

                    {/* Plan Summary Card */}
                    <div className="card" style={{
                        padding: 'var(--space-5)',
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                        border: '1px solid var(--brand-cyan)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h3>{plan.name} Plan</h3>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                ${plan.price}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/mo</span>
                            </div>
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {plan.features.map((feature) => (
                                <li key={feature} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    marginBottom: 'var(--space-2)',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                }}>
                                    <Check size={16} color="#4ade80" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Test Mode Card Info */}
                    {isStripeTestMode() && (
                        <div style={{
                            marginTop: 'var(--space-4)',
                            padding: 'var(--space-4)',
                            background: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid rgba(250, 204, 21, 0.3)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <h4 style={{ color: '#facc15', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>
                                🧪 Test Mode - Use these cards:
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    ✓ Success: {TEST_CARDS.SUCCESS}
                                </code>
                                <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    ✗ Decline: {TEST_CARDS.DECLINED}
                                </code>
                            </div>
                            <p style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                CVC: any 3 digits • Expiry: any future date
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Column - Payment Form */}
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-5)',
                        paddingBottom: 'var(--space-4)',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            background: 'var(--brand-gradient)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <CreditCard size={20} color="white" />
                        </div>
                        <div>
                            <h3 style={{ marginBottom: 2 }}>Payment Details</h3>
                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                Enter your card information
                            </p>
                        </div>
                    </div>

                    <Elements
                        stripe={stripePromise}
                        options={{
                            appearance: {
                                theme: 'night',
                                variables: {
                                    colorPrimary: '#06b6d4',
                                },
                            },
                        }}
                    >
                        <CheckoutForm planId={planId} />
                    </Elements>
                </div>
            </div>
        </>
    );
}
