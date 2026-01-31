'use client';

/**
 * Pricing Page
 * Subscription plans with Stripe integration
 * 
 * ⚠️ TEST MODE ONLY - See .agent/rules/payment-security.md
 */

import { useState } from 'react';
import { Check, Zap, Shield, Crown, Building } from 'lucide-react';
import { PRICING_PLANS, PlanId, isStripeTestMode, TEST_CARDS } from '@/lib/stripe';
import { StripeTestModeBanner } from '@/components/StripeProvider';

export default function PricingPage() {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const yearlyDiscount = 0.2; // 20% discount

    const getPrice = (basePrice: number | null) => {
        if (basePrice === null) return 'Custom';
        if (billingPeriod === 'yearly') {
            return Math.round(basePrice * 12 * (1 - yearlyDiscount));
        }
        return basePrice;
    };

    const handleSubscribe = async (planId: PlanId) => {
        if (planId === 'FREE' || planId === 'ENTERPRISE') {
            // Free plan doesn't need payment, Enterprise needs contact
            return;
        }

        setSelectedPlan(planId);
        setIsLoading(true);

        try {
            // Create checkout session via API
            const response = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: PRICING_PLANS[planId].priceId,
                    billingPeriod,
                }),
            });

            const { url } = await response.json();

            if (url) {
                window.location.href = url;
            }
        } catch (error) {
            console.error('Error creating checkout:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const planIcons: Record<PlanId, React.ReactNode> = {
        FREE: <Zap size={24} />,
        STARTER: <Shield size={24} />,
        PRO: <Crown size={24} />,
        ENTERPRISE: <Building size={24} />,
    };

    return (
        <>
            {/* Test Mode Banner */}
            <StripeTestModeBanner />

            <div style={{ padding: 'var(--space-8)', maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <header style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <h1 style={{ marginBottom: 'var(--space-3)' }}>
                        Upgrade Your Trading
                    </h1>
                    <p className="text-secondary" style={{ fontSize: '1.125rem', maxWidth: 600, margin: '0 auto' }}>
                        Choose the plan that fits your trading needs. All plans include a 14-day free trial.
                    </p>

                    {/* Billing Toggle */}
                    <div style={{
                        marginTop: 'var(--space-6)',
                        display: 'inline-flex',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-full)',
                        padding: '4px',
                    }}>
                        <button
                            onClick={() => setBillingPeriod('monthly')}
                            style={{
                                padding: 'var(--space-2) var(--space-4)',
                                background: billingPeriod === 'monthly' ? 'var(--bg-elevated)' : 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-full)',
                                color: billingPeriod === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingPeriod('yearly')}
                            style={{
                                padding: 'var(--space-2) var(--space-4)',
                                background: billingPeriod === 'yearly' ? 'var(--bg-elevated)' : 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-full)',
                                color: billingPeriod === 'yearly' ? 'var(--text-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            Yearly
                            <span style={{
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                            }}>
                                -20%
                            </span>
                        </button>
                    </div>
                </header>

                {/* Pricing Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)',
                }}>
                    {(Object.entries(PRICING_PLANS) as [PlanId, typeof PRICING_PLANS[PlanId]][]).map(([id, plan]) => (
                        <div
                            key={id}
                            className="card"
                            style={{
                                padding: 'var(--space-6)',
                                position: 'relative',
                                border: 'popular' in plan && plan.popular
                                    ? '2px solid var(--brand-cyan)'
                                    : '1px solid var(--border-subtle)',
                                transform: 'popular' in plan && plan.popular ? 'scale(1.05)' : 'none',
                            }}
                        >
                            {/* Popular Badge */}
                            {'popular' in plan && plan.popular && (
                                <div style={{
                                    position: 'absolute',
                                    top: -12,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    padding: '4px 16px',
                                    background: 'var(--brand-gradient)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'white',
                                }}>
                                    MOST POPULAR
                                </div>
                            )}

                            {/* Plan Icon */}
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: 'var(--radius-md)',
                                background: 'popular' in plan && plan.popular
                                    ? 'var(--brand-gradient)'
                                    : 'var(--bg-elevated)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'popular' in plan && plan.popular ? 'white' : 'var(--brand-cyan)',
                                marginBottom: 'var(--space-4)',
                            }}>
                                {planIcons[id]}
                            </div>

                            {/* Plan Name */}
                            <h3 style={{ marginBottom: 'var(--space-2)' }}>{plan.name}</h3>

                            {/* Price */}
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                                    {plan.price === null ? 'Custom' : `$${getPrice(plan.price)}`}
                                </span>
                                {plan.price !== null && (
                                    <span className="text-muted" style={{ fontSize: '1rem' }}>
                                        /{billingPeriod === 'yearly' ? 'year' : 'mo'}
                                    </span>
                                )}
                            </div>

                            {/* Features */}
                            <ul style={{
                                listStyle: 'none',
                                padding: 0,
                                margin: 0,
                                marginBottom: 'var(--space-6)',
                                minHeight: 180,
                            }}>
                                {plan.features.map((feature) => (
                                    <li
                                        key={feature}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            marginBottom: 'var(--space-2)',
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        <Check size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                onClick={() => handleSubscribe(id)}
                                disabled={isLoading && selectedPlan === id}
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-3)',
                                    background: id === 'FREE'
                                        ? 'var(--bg-elevated)'
                                        : id === 'ENTERPRISE'
                                            ? 'transparent'
                                            : 'var(--brand-gradient)',
                                    border: id === 'ENTERPRISE'
                                        ? '1px solid var(--border-subtle)'
                                        : 'none',
                                    borderRadius: 'var(--radius-md)',
                                    color: id === 'FREE' || id === 'ENTERPRISE'
                                        ? 'var(--text-primary)'
                                        : 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: isLoading && selectedPlan === id ? 0.7 : 1,
                                }}
                            >
                                {isLoading && selectedPlan === id
                                    ? 'Processing...'
                                    : id === 'FREE'
                                        ? 'Current Plan'
                                        : id === 'ENTERPRISE'
                                            ? 'Contact Sales'
                                            : 'Subscribe Now'
                                }
                            </button>
                        </div>
                    ))}
                </div>

                {/* Test Mode Info Box */}
                {isStripeTestMode() && (
                    <div style={{
                        background: 'rgba(250, 204, 21, 0.1)',
                        border: '1px solid rgba(250, 204, 21, 0.3)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-5)',
                        marginBottom: 'var(--space-6)',
                    }}>
                        <h4 style={{ color: '#facc15', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            ⚠️ Modo de Prueba Activo
                        </h4>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-3)', fontSize: '0.875rem' }}>
                            Estás en modo de prueba de Stripe. No se procesarán pagos reales.
                            Usa las siguientes tarjetas de prueba:
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 'var(--space-2)'
                        }}>
                            {[
                                { number: TEST_CARDS.SUCCESS, desc: 'Pago exitoso' },
                                { number: TEST_CARDS.REQUIRES_3DS, desc: 'Requiere 3D Secure' },
                                { number: TEST_CARDS.INSUFFICIENT_FUNDS, desc: 'Fondos insuficientes' },
                                { number: TEST_CARDS.DECLINED, desc: 'Tarjeta rechazada' },
                            ].map(({ number, desc }) => (
                                <div
                                    key={number}
                                    style={{
                                        background: 'var(--bg-surface)',
                                        padding: 'var(--space-3)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                                        {number.replace(/(\d{4})/g, '$1 ').trim()}
                                    </code>
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{desc}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-muted" style={{ marginTop: 'var(--space-3)', fontSize: '0.75rem' }}>
                            CVC: cualquier 3 dígitos • Fecha: cualquier fecha futura
                        </p>
                    </div>
                )}

                {/* FAQ */}
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                        Frequently Asked Questions
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {[
                            {
                                q: 'Can I cancel anytime?',
                                a: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
                            },
                            {
                                q: 'What payment methods do you accept?',
                                a: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal through our secure Stripe integration.',
                            },
                            {
                                q: 'Is there a free trial?',
                                a: 'Yes! All paid plans include a 14-day free trial. No credit card required to start.',
                            },
                            {
                                q: 'Can I upgrade or downgrade my plan?',
                                a: 'Absolutely. You can change your plan at any time. The difference will be prorated.',
                            },
                        ].map(({ q, a }) => (
                            <div
                                key={q}
                                className="card"
                                style={{ padding: 'var(--space-4)' }}
                            >
                                <h4 style={{ marginBottom: 'var(--space-2)' }}>{q}</h4>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>{a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
