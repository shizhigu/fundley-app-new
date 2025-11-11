import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/config'

/**
 * PATCH /api/watchlist-groups/[id]
 * Update a watchlist group
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params

    // Get database user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = userResult[0].id

    // Verify ownership
    const existingGroup = await db`
      SELECT * FROM watchlist_groups WHERE id = ${groupId}
    `
    if (existingGroup.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    if (existingGroup[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, description, is_default } = body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined && name.trim().length > 0) {
      updates.push(`name = $${values.length + 1}`)
      values.push(name.trim())
    }

    if (description !== undefined) {
      updates.push(`description = $${values.length + 1}`)
      values.push(description || null)
    }

    if (is_default !== undefined) {
      // If setting as default, unset other defaults first
      if (is_default) {
        await db`
          UPDATE watchlist_groups
          SET is_default = false
          WHERE user_id = ${userId}
        `
      }
      updates.push(`is_default = $${values.length + 1}`)
      values.push(is_default)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`)

    // Perform update using tagged template
    const result = await db`
      UPDATE watchlist_groups
      SET ${db.unsafe(updates.join(', '))}
      WHERE id = ${groupId} AND user_id = ${userId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
    }

    return NextResponse.json({ group: result[0] })
  } catch (error: any) {
    console.error('Error updating watchlist group:', error)

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

/**
 * DELETE /api/watchlist-groups/[id]
 * Delete a watchlist group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params

    // Get database user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = userResult[0].id

    // Verify ownership and check if it's the default group
    const existingGroup = await db`
      SELECT * FROM watchlist_groups WHERE id = ${groupId}
    `
    if (existingGroup.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    if (existingGroup[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent deletion of default group
    if (existingGroup[0].is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default group' },
        { status: 400 }
      )
    }

    // Delete group (CASCADE will remove associated watchlist items)
    await db`
      DELETE FROM watchlist_groups
      WHERE id = ${groupId} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting watchlist group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
