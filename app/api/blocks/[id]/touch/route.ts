import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { analysisBlocks, blockModificationHistory } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/blocks/[id]/touch
// Touch a block to update its updated_at timestamp (for manual cache-busting)
// Works by inserting a modification history record, which triggers automatic updated_at update via database trigger
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // First verify the block exists and belongs to the user
    const block = await db
      .select()
      .from(analysisBlocks)
      .where(
        and(
          eq(analysisBlocks.id, id),
          eq(analysisBlocks.user_id, userId)
        )
      )
      .limit(1);

    if (block.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Insert a modification history record with type 'manual_refresh'
    // This will trigger the database trigger that automatically updates analysis_blocks.updated_at
    // Same mechanism as Agent's update_analysis_block tool
    await db.insert(blockModificationHistory).values({
      block_id: id,
      chat_id: block[0].chat_id, // Use the block's original chat_id
      user_id: userId,
      modification_type: 'manual_refresh',
    });

    // Fetch the updated block to get the new updated_at timestamp
    const updatedBlock = await db
      .select()
      .from(analysisBlocks)
      .where(eq(analysisBlocks.id, id))
      .limit(1);

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
