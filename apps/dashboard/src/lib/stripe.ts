/**
 * Stripe Configuration - TEST MODE ONLY
 * 
 * ⚠️ SECURITY RULE: This configuration ONLY supports TEST mode credentials.
 * Production keys (pk_live_, sk_live_) are PROHIBITED in development.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Validate that we're using TEST keys
const validateTestKey = (key: string | undefined, keyType: string): string => {
    if (!key) {
        console.warn(`[Stripe] ${keyType} not configured. Using placeholder for development.`);
        return '';
    }

    // In development, ONLY allow test keys
    if (process.env.NODE_ENV !== 'production') {
        if (key.startsWith('pk_live_') || key.startsWith('sk_live_')) {
            throw new Error(
                `🚨 SECURITY ERROR: Production Stripe keys detected in development mode!\n` +
                `Never use pk_live_ or sk_live_ keys in local development.\n` +
                `Use test keys from: https://dashboard.stripe.com/test/apikeys`
            );
        }
    }

    return key;
};

// Get and validate the publishable key
const stripePublishableKey = validateTestKey(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'Stripe Publishable Key'
);

// Singleton promise for Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe instance (singleton pattern)
 */
export const getStripe = (): Promise<Stripe | null> => {
    if (!stripePromise && stripePublishableKey) {
        stripePromise = loadStripe(stripePublishableKey);
    }
    return stripePromise || Promise.resolve(null);
};

/**
 * Check if Stripe is in test mode
 */
export const isStripeTestMode = (): boolean => {
    return stripePublishableKey.startsWith('pk_test_') || !stripePublishableKey;
};

/**
 * Stripe test card numbers for development
 */
export const TEST_CARDS = {
    SUCCESS: '4242424242424242',
    REQUIRES_3DS: '4000000000003220',
    INSUFFICIENT_FUNDS: '4000000000009995',
    DECLINED: '4000000000000002',
    EXPIRED: '4000000000000069',
    INCORRECT_CVC: '4000000000000127',
} as const;

/**
 * Pricing plans configuration
 */
export const PRICING_PLANS = {
    FREE: {
        id: 'free',
        name: 'Free',
        price: 0,
        priceId: null,
        features: [
            '2 trading strategies',
            '1 exchange connection',
            'Basic signals',
            'Community support',
        ],
        limits: {
            strategies: 2,
            exchanges: 1,
            backtests: 5,
        },
    },
    STARTER: {
        id: 'starter',
        name: 'Starter',
        price: 29,
        priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_test_starter',
        features: [
            '10 trading strategies',
            '5 exchange connections',
            'Advanced signals',
            'Email support',
            'Basic backtesting',
        ],
        limits: {
            strategies: 10,
            exchanges: 5,
            backtests: 50,
        },
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
        price: 99,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_test_pro',
        features: [
            '50 trading strategies',
            '20 exchange connections',
            'Premium ML signals',
            'Priority support',
            'Unlimited backtesting',
            'API access',
        ],
        limits: {
            strategies: 50,
            exchanges: 20,
            backtests: -1, // unlimited
        },
        popular: true,
    },
    ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise',
        price: null, // Custom pricing
        priceId: null,
        features: [
            'Unlimited strategies',
            'Unlimited connections',
            'Custom ML models',
            'Dedicated support',
            'Custom integrations',
            'SLA guarantee',
            'White-label options',
        ],
        limits: {
            strategies: -1,
            exchanges: -1,
            backtests: -1,
        },
    },
} as const;

export type PlanId = keyof typeof PRICING_PLANS;
