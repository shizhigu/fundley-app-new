import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/config'
import type { WatchlistGroupInsert } from '@/lib/db/schema/watchlist'

/**
 * GET /api/watchlist-groups
 * Get user's watchlist groups
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

    // Get all watchlist groups for this user with item count
    const groups = await db`
      SELECT
        wg.id,
        wg.user_id,
        wg.name,
        wg.description,
        wg.is_default,
        wg.created_at,
        wg.updated_at,
        COUNT(w.id)::int as item_count
      FROM watchlist_groups wg
      LEFT JOIN watchlist w ON w.group_id = wg.id
      WHERE wg.user_id = ${userId}
      GROUP BY wg.id, wg.user_id, wg.name, wg.description, wg.is_default, wg.created_at, wg.updated_at
      ORDER BY wg.is_default DESC, wg.created_at ASC
    `

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Error fetching watchlist groups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/watchlist-groups
 * Create a new watchlist group
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
    const { name, description, is_default = false } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await db`
        UPDATE watchlist_groups
        SET is_default = false
        WHERE user_id = ${userId}
      `
    }

    // Insert new group
    const result = await db`
      INSERT INTO watchlist_groups (user_id, name, description, is_default)
      VALUES (${userId}, ${name.trim()}, ${description || null}, ${is_default})
      RETURNING *
    `

    return NextResponse.json({ group: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating watchlist group:', error)

    // Handle unique constraint violation
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
