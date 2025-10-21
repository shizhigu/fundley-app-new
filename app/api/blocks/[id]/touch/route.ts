import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// POST /api/blocks/[id]/touch
// Touch a block to update its updated_at timestamp (for manual cache-busting)
// Works by inserting a modification history record, which triggers automatic updated_at update via database trigger
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: blockId } = await params;

    // First verify the block exists and belongs to the user
    const block = await db`
      SELECT chat_id FROM analysis_blocks
      WHERE id = ${blockId} AND user_id = ${userId}
    `;

    if (block.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const chatId = block[0].chat_id;

    // Insert a modification history record with type 'manual_refresh'
    // This will trigger the database trigger that automatically updates analysis_blocks.updated_at
    // Same mechanism as Agent's update_analysis_block tool
    await db`
      INSERT INTO block_modification_history (
        block_id,
        chat_id,
        user_id,
        modification_type
      )
      VALUES (
        ${blockId},
        ${chatId},
        ${userId},
        'manual_refresh'
      )
    `;

    // Fetch the updated block to get the new updated_at timestamp
    const updatedBlock = await db`
      SELECT updated_at FROM analysis_blocks WHERE id = ${blockId}
    `;

    return NextResponse.json({
      success: true,
      updated_at: updatedBlock[0].updated_at,
    });
  } catch (error) {
    console.error('Error touching block:', error);
    return NextResponse.json(
      { error: 'Failed to touch block' },
      { status: 500 }
    );
  }
}
