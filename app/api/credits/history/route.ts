/**
 * Get user's credit transaction history with pagination
 *
 * GET /api/credits/history?limit=10&offset=0
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getCreditTransactionHistory } from '@/lib/credits/db';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { transactions, total } = await getCreditTransactionHistory(userId, limit, offset);

    return NextResponse.json({ transactions, total });
  } catch (error) {
    console.error('[Credits] Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}
