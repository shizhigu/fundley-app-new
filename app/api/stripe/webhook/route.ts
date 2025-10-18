/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe events:
 * - checkout.session.completed - New subscription created
 * - customer.subscription.updated - Subscription status changed
 * - customer.subscription.deleted - Subscription canceled
 * - invoice.payment_succeeded - Monthly billing successful → Reset credits
 * - invoice.payment_failed - Payment failed
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { neon } from '@neondatabase/serverless';
import { PLAN_DETAILS } from '@/lib/credits';
import { resetSubscriptionCredits } from '@/lib/credits/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const sql = neon(process.env.DATABASE_URL!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle checkout.session.completed
 * Create subscription record and grant initial credits
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('[Stripe Webhook] Processing checkout.session.completed:', session.id);

  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type as keyof typeof PLAN_DETAILS;

  if (!userId || !planType) {
    console.error('[Stripe Webhook] Missing metadata in checkout session');
    return;
  }

  const plan = PLAN_DETAILS[planType];
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  // Get billing period from first subscription item
  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start;
  const currentPeriodEnd = firstItem?.current_period_end;

  // Create or update subscription in database
  await sql`
    INSERT INTO subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      plan_type,
      status,
      monthly_credits,
      current_period_start,
      current_period_end
    )
    VALUES (
      ${userId},
      ${session.customer},
      ${subscription.id},
      ${planType},
      ${subscription.status},
      ${plan.monthly_credits},
      to_timestamp(${currentPeriodStart}),
      to_timestamp(${currentPeriodEnd})
    )
    ON CONFLICT (stripe_subscription_id)
    DO UPDATE SET
      status = ${subscription.status},
      plan_type = ${planType},
      monthly_credits = ${plan.monthly_credits},
      current_period_start = to_timestamp(${currentPeriodStart}),
      current_period_end = to_timestamp(${currentPeriodEnd}),
      updated_at = NOW()
  `;

  // Grant initial subscription credits
  await resetSubscriptionCredits(userId, plan.monthly_credits);

  console.log(`[Stripe Webhook] Subscription created for user ${userId}, plan: ${planType}`);
}

/**
 * Handle customer.subscription.updated
 * Update subscription status
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('[Stripe Webhook] Processing customer.subscription.updated:', subscription.id);

  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[Stripe Webhook] Missing user_id in subscription metadata');
    return;
  }

  // Get billing period from first subscription item
  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start;
  const currentPeriodEnd = firstItem?.current_period_end;

  // Update subscription in database
  await sql`
    UPDATE subscriptions
    SET
      status = ${subscription.status},
      current_period_start = to_timestamp(${currentPeriodStart}),
      current_period_end = to_timestamp(${currentPeriodEnd}),
      cancel_at_period_end = ${subscription.cancel_at_period_end},
      canceled_at = ${subscription.canceled_at ? `to_timestamp(${subscription.canceled_at})` : null},
      updated_at = NOW()
    WHERE stripe_subscription_id = ${subscription.id}
  `;

  console.log(`[Stripe Webhook] Subscription ${subscription.id} status updated to: ${subscription.status}`);
}

/**
 * Handle customer.subscription.deleted
 * Mark subscription as canceled and zero out subscription credits
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[Stripe Webhook] Processing customer.subscription.deleted:', subscription.id);

  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[Stripe Webhook] Missing user_id in subscription metadata');
    return;
  }

  // Mark subscription as canceled
  await sql`
    UPDATE subscriptions
    SET
      status = 'canceled',
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE stripe_subscription_id = ${subscription.id}
  `;

  // Zero out subscription credits (keep addon credits)
  await sql`
    UPDATE users
    SET subscription_credits = 0
    WHERE id = ${userId}
  `;

  console.log(`[Stripe Webhook] Subscription ${subscription.id} canceled for user ${userId}`);
}

/**
 * Handle invoice.payment_succeeded
 * Reset subscription credits on successful monthly billing
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('[Stripe Webhook] Processing invoice.payment_succeeded:', invoice.id);

  // Only process subscription invoices (not one-time payments)
  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
  const userId = subscription.metadata?.user_id;
  const planType = subscription.metadata?.plan_type as keyof typeof PLAN_DETAILS;

  if (!userId || !planType) {
    console.error('[Stripe Webhook] Missing metadata in subscription');
    return;
  }

  const plan = PLAN_DETAILS[planType];

  // Reset subscription credits (monthly renewal)
  await resetSubscriptionCredits(userId, plan.monthly_credits);

  console.log(`[Stripe Webhook] Credits reset for user ${userId}, plan: ${planType}`);
}

/**
 * Handle invoice.payment_failed
 * Update subscription status to past_due
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[Stripe Webhook] Processing invoice.payment_failed:', invoice.id);

  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) {
    return;
  }

  // Update subscription status to past_due
  await sql`
    UPDATE subscriptions
    SET
      status = 'past_due',
      updated_at = NOW()
    WHERE stripe_subscription_id = ${subscriptionId}
  `;

  console.log(`[Stripe Webhook] Subscription ${subscriptionId} marked as past_due`);
}
