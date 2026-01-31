/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for subscription management
 * 
 * ⚠️ TEST MODE ONLY - See .agent/rules/payment-security.md
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Validate test mode
const validateTestMode = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (process.env.NODE_ENV !== 'production') {
        if (secretKey.startsWith('sk_live_')) {
            throw new Error('🚨 SECURITY ERROR: Production keys in development!');
        }
    }

    return { secretKey, webhookSecret };
};

const getStripe = () => {
    const { secretKey } = validateTestMode();

    if (!secretKey.startsWith('sk_test_')) {
        return null;
    }

    return new Stripe(secretKey, {
        apiVersion: '2026-01-28.clover',
    });
};

export async function POST(request: NextRequest) {
    const stripe = getStripe();
    const { webhookSecret } = validateTestMode();

    if (!stripe) {
        return NextResponse.json(
            { error: 'Stripe not configured (test mode)' },
            { status: 503 }
        );
    }

    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json(
            { error: `Webhook signature verification failed: ${err.message}` },
            { status: 400 }
        );
    }

    // Log event in test mode
    console.log(`[Stripe Webhook] Received event: ${event.type} (TEST MODE)`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutComplete(session);
                break;
            }

            case 'customer.subscription.created': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCreated(subscription);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCanceled(subscription);
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                await handleInvoicePaid(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice);
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true, testMode: true });
    } catch (error: any) {
        console.error('[Stripe Webhook] Error processing event:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// Event Handlers
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
    console.log('[Stripe] Checkout completed:', {
        sessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        testMode: session.metadata?.testMode,
    });

    // TODO: Update user subscription in database
    // const userId = session.client_reference_id;
    // await prisma.user.update({
    //     where: { id: userId },
    //     data: {
    //         stripeCustomerId: session.customer as string,
    //         subscriptionId: session.subscription as string,
    //         subscriptionStatus: 'active',
    //     }
    // });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    console.log('[Stripe] Subscription created:', {
        id: subscription.id,
        status: subscription.status,
        customerId: subscription.customer,
    });

    // TODO: Activate user features based on plan
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log('[Stripe] Subscription updated:', {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    // TODO: Update user subscription status
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    console.log('[Stripe] Subscription canceled:', {
        id: subscription.id,
        customerId: subscription.customer,
    });

    // TODO: Downgrade user to free plan
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    console.log('[Stripe] Invoice paid:', {
        id: invoice.id,
        amount: invoice.amount_paid,
        customerId: invoice.customer,
    });

    // TODO: Send receipt email, update billing history
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log('[Stripe] Payment failed:', {
        id: invoice.id,
        attemptCount: invoice.attempt_count,
        customerId: invoice.customer,
    });

    // TODO: Send payment failed notification, handle retry logic
}
