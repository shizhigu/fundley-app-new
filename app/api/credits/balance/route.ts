/**
 * Get user's credit balance
 *
 * GET /api/credits/balance
 *
 * Returns:
 * - subscription_credits
 * - addon_credits
 * - total_credits
 * - is_internal
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserCreditBalance } from '@/lib/credits/db';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const balance = await getUserCreditBalance(userId);

    if (!balance) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error('[Credits] Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}
