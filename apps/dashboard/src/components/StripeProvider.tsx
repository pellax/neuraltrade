'use client';

/**
 * Stripe Payment Provider
 * Wraps the app with Stripe Elements context
 * 
 * ⚠️ TEST MODE ONLY - See .agent/rules/payment-security.md
 */

import { Elements } from '@stripe/react-stripe-js';
import { getStripe, isStripeTestMode } from '@/lib/stripe';
import { ReactNode, useEffect, useState } from 'react';

interface StripeProviderProps {
    children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
    const [stripePromise] = useState(() => getStripe());

    return (
        <Elements
            stripe={stripePromise}
            options={{
                appearance: {
                    theme: 'night',
                    variables: {
                        colorPrimary: '#06b6d4',
                        colorBackground: '#0a0a0f',
                        colorText: '#e4e4e7',
                        colorDanger: '#f87171',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        borderRadius: '8px',
                    },
                },
            }}
        >
            {children}
        </Elements>
    );
}

/**
 * Test Mode Banner Component
 * Displays a warning banner when using Stripe test mode
 */
export function StripeTestModeBanner() {
    const [isTestMode, setIsTestMode] = useState(true);

    useEffect(() => {
        setIsTestMode(isStripeTestMode());
    }, []);

    if (!isTestMode) return null;

    return (
        <div
            style={{
                background: 'linear-gradient(90deg, #f59e0b 0%, #eab308 100%)',
                color: '#000',
                padding: '8px 16px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
            }}
        >
            <span>⚠️</span>
            <span>STRIPE TEST MODE - No se procesarán pagos reales</span>
            <span style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
            }}>
                Usa tarjeta 4242 4242 4242 4242
            </span>
        </div>
    );
}
