/**
 * Get user's subscription status
 *
 * GET /api/subscription/status
 *
 * Returns the user's current active subscription (if any)
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query active subscription
    const result = await sql`
      SELECT
        s.id,
        s.plan_type,
        s.status,
        s.monthly_credits,
        s.current_period_start,
        s.current_period_end,
        s.cancel_at_period_end,
        s.canceled_at,
        s.created_at
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE u.clerk_user_id = ${userId}
        AND s.status IN ('active', 'trialing', 'past_due')
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null
      });
    }

    const subscription = result[0];

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        planType: subscription.plan_type,
        status: subscription.status,
        monthlyCredits: subscription.monthly_credits,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
        createdAt: subscription.created_at,
      }
    });
  } catch (error) {
    console.error('[Subscription Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
