import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/config'
import type { Watchlist, WatchlistInsert } from '@/lib/db/schema/watchlist'

/**
 * GET /api/watchlist
 * Get user's watchlist
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get database user_id from clerk_user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = userResult[0].id

    // Get watchlist items
    const watchlist = await db`
      SELECT * FROM watchlist
      WHERE user_id = ${userId}
      ORDER BY added_at DESC
    `

    return NextResponse.json({ watchlist })
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/watchlist
 * Add item to watchlist
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get database user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = userResult[0].id

    // Parse request body
    const body: Omit<WatchlistInsert, 'user_id'> = await request.json()
    const { symbol, name, asset_type = 'stock', notes, tags = [], alert_price_high, alert_price_low, position_size } = body

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
    }

    // Insert watchlist item (ON CONFLICT DO NOTHING to prevent duplicates)
    const result = await db`
      INSERT INTO watchlist (user_id, symbol, name, asset_type, notes, tags, alert_price_high, alert_price_low, position_size)
      VALUES (${userId}, ${symbol.toUpperCase()}, ${name || null}, ${asset_type}, ${notes || null}, ${JSON.stringify(tags)}, ${alert_price_high || null}, ${alert_price_low || null}, ${position_size || null})
      ON CONFLICT (user_id, symbol) DO NOTHING
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Symbol already in watchlist' }, { status: 409 })
    }

    return NextResponse.json({ item: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/watchlist?symbol=AAPL
 * Remove item from watchlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const symbol = request.nextUrl.searchParams.get('symbol')
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
    }

    // Get database user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = userResult[0].id

    // Delete item
    await db`
      DELETE FROM watchlist
      WHERE user_id = ${userId} AND symbol = ${symbol.toUpperCase()}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
