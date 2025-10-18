/**
 * Create Stripe Checkout Session for subscription
 *
 * POST /api/stripe/create-checkout-session
 * Body: { plan_type: 'starter' | 'pro' | 'institutional' }
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { neon } from '@neondatabase/serverless';
import { PLAN_DETAILS } from '@/lib/credits';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan_type } = body;

    // Validate plan type
    if (!plan_type || !(plan_type in PLAN_DETAILS)) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const plan = PLAN_DETAILS[plan_type as keyof typeof PLAN_DETAILS];

    // Get user from database
    const userResult = await sql`
      SELECT id, email, clerk_user_id
      FROM users
      WHERE clerk_user_id = ${userId}
      LIMIT 1
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // Check if user already has a Stripe customer ID
    const subscriptionResult = await sql`
      SELECT stripe_customer_id
      FROM subscriptions
      WHERE user_id = ${user.id}
      AND status IN ('active', 'trialing')
      LIMIT 1
    `;

    let customerId: string | undefined;

    if (subscriptionResult.length > 0 && subscriptionResult[0].stripe_customer_id) {
      customerId = subscriptionResult[0].stripe_customer_id;
    }

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          clerk_user_id: user.clerk_user_id,
        },
      });
      customerId = customer.id;
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true, // Enable coupon/promo code input
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        clerk_user_id: user.clerk_user_id,
        plan_type: plan_type,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          clerk_user_id: user.clerk_user_id,
          plan_type: plan_type,
          monthly_credits: plan.monthly_credits.toString(),
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe] Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
