/**
 * Stripe Checkout Session API Route
 * Creates a Stripe Checkout session for subscription
 * 
 * ⚠️ TEST MODE ONLY - See .agent/rules/payment-security.md
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Validate that we're using TEST keys only
const validateTestMode = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';

    if (process.env.NODE_ENV !== 'production') {
        if (secretKey.startsWith('sk_live_')) {
            throw new Error(
                '🚨 SECURITY ERROR: Production Stripe keys detected in development mode!'
            );
        }
    }

    return secretKey;
};

// Initialize Stripe with test key validation
const getStripe = () => {
    const key = validateTestMode();

    if (!key || !key.startsWith('sk_test_')) {
        console.warn('[Stripe] No valid test secret key configured');
        return null;
    }

    return new Stripe(key, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
    });
};

export async function POST(request: NextRequest) {
    try {
        const stripe = getStripe();

        if (!stripe) {
            return NextResponse.json(
                {
                    error: 'Stripe not configured',
                    testMode: true,
                    message: 'Configure STRIPE_SECRET_KEY (sk_test_...) in .env.local'
                },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { priceId, billingPeriod } = body;

        if (!priceId) {
            return NextResponse.json(
                { error: 'Price ID is required' },
                { status: 400 }
            );
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'}/dashboard/pricing`,
            metadata: {
                billingPeriod,
                testMode: 'true', // Always mark test transactions
            },
            // Enable promotional codes for test
            allow_promotion_codes: true,
            // Collect billing address
            billing_address_collection: 'required',
            // Trial period
            subscription_data: {
                trial_period_days: 14,
            },
        });

        return NextResponse.json({
            url: session.url,
            sessionId: session.id,
            testMode: true,
        });
    } catch (error: any) {
        console.error('[Stripe] Checkout error:', error);

        return NextResponse.json(
            {
                error: error.message || 'Failed to create checkout session',
                testMode: true,
            },
            { status: 500 }
        );
    }
}
