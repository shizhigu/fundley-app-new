import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/config'
import type { Watchlist, WatchlistInsert } from '@/lib/db/schema/watchlist'

/**
 * GET /api/watchlist
 * Get user's watchlist
 * Optional query param: groupId - filter by specific group
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

    // Get optional groupId filter
    const groupId = request.nextUrl.searchParams.get('groupId')

    // Get watchlist items with optional group filter
    let watchlist
    if (groupId) {
      watchlist = await db`
        SELECT w.*, wg.name as group_name
        FROM watchlist w
        LEFT JOIN watchlist_groups wg ON w.group_id = wg.id
        WHERE w.user_id = ${userId} AND w.group_id = ${groupId}
        ORDER BY w.added_at DESC
      `
    } else {
      watchlist = await db`
        SELECT w.*, wg.name as group_name
        FROM watchlist w
        LEFT JOIN watchlist_groups wg ON w.group_id = wg.id
        WHERE w.user_id = ${userId}
        ORDER BY w.added_at DESC
      `
    }

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
 * Add item(s) to watchlist (supports batch)
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
    const body = await request.json()
    const { symbols, asset_type = 'stock', group_id } = body

    if (!symbols || symbols.length === 0) {
      return NextResponse.json({ error: 'Symbols are required' }, { status: 400 })
    }

    // If group_id not provided, get user's default group
    let targetGroupId = group_id
    if (!targetGroupId) {
      const defaultGroup = await db`
        SELECT id FROM watchlist_groups
        WHERE user_id = ${userId} AND is_default = true
        LIMIT 1
      `
      if (defaultGroup.length > 0) {
        targetGroupId = defaultGroup[0].id
      }
    }

    // Batch insert watchlist items (ON CONFLICT DO NOTHING to prevent duplicates)
    const inserted = []
    const skipped = []

    for (const symbol of symbols) {
      const symbolUpper = symbol.toUpperCase().trim()
      if (!symbolUpper) continue

      const result = await db`
        INSERT INTO watchlist (user_id, group_id, symbol, asset_type)
        VALUES (${userId}, ${targetGroupId || null}, ${symbolUpper}, ${asset_type})
        ON CONFLICT (user_id, group_id, symbol) DO NOTHING
        RETURNING *
      `

      if (result.length > 0) {
        inserted.push(result[0])
      } else {
        skipped.push(symbolUpper)
      }
    }

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      skipped: skipped.length,
      skipped_symbols: skipped,
      items: inserted
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/watchlist?symbol=AAPL&groupId=xxx
 * Remove item from watchlist
 * Optional query param: groupId - only delete from specific group
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const symbol = request.nextUrl.searchParams.get('symbol')
    const groupId = request.nextUrl.searchParams.get('groupId')

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

    // Delete item (with optional group filter)
    if (groupId) {
      await db`
        DELETE FROM watchlist
        WHERE user_id = ${userId} AND symbol = ${symbol.toUpperCase()} AND group_id = ${groupId}
      `
    } else {
      // If no groupId specified, delete from all groups
      await db`
        DELETE FROM watchlist
        WHERE user_id = ${userId} AND symbol = ${symbol.toUpperCase()}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
