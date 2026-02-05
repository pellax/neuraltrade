/**
 * Create Subscription API Route
 * Creates a Stripe subscription with payment intent
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

    if (!key) {
        console.warn('[Stripe] No secret key configured');
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
                    error: 'Stripe not configured. Please add STRIPE_SECRET_KEY to .env.local',
                    testMode: true,
                },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { priceId, email, name } = body;

        console.log('[Stripe] Creating subscription for:', { priceId, email, name });

        if (!priceId || !email || !name) {
            return NextResponse.json(
                { error: 'Missing required fields: priceId, email, name' },
                { status: 400 }
            );
        }

        // Create or retrieve customer
        const customers = await stripe.customers.list({ email, limit: 1 });
        let customer: Stripe.Customer;

        if (customers.data.length > 0) {
            customer = customers.data[0];
            console.log('[Stripe] Found existing customer:', customer.id);
        } else {
            customer = await stripe.customers.create({
                email,
                name,
                metadata: {
                    testMode: 'true',
                },
            });
            console.log('[Stripe] Created new customer:', customer.id);
        }

        // First, get the price to determine amount
        const price = await stripe.prices.retrieve(priceId);
        console.log('[Stripe] Price retrieved:', price.id, 'Amount:', price.unit_amount);

        // Create a PaymentIntent directly for immediate payment
        const paymentIntent = await stripe.paymentIntents.create({
            amount: price.unit_amount || 2900, // fallback to $29
            currency: price.currency || 'usd',
            customer: customer.id,
            setup_future_usage: 'off_session', // Save card for future payments
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                priceId,
                testMode: 'true',
            },
        });

        console.log('[Stripe] PaymentIntent created:', paymentIntent.id, 'ClientSecret exists:', !!paymentIntent.client_secret);

        if (!paymentIntent.client_secret) {
            throw new Error('Failed to create payment intent - no client secret returned');
        }

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            customerId: customer.id,
            paymentIntentId: paymentIntent.id,
            testMode: true,
        });
    } catch (error: any) {
        console.error('[Stripe] Subscription error:', error);

        return NextResponse.json(
            {
                error: error.message || 'Failed to create subscription',
                testMode: true,
            },
            { status: 500 }
        );
    }
}
