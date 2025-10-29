import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/blocks/[id]/history - Get modification history for a block
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: blockId } = await params;
    const userId = session.user.id;

    // First verify user owns this block
    const block = await db`
      SELECT user_id
      FROM deliverables
      WHERE id = ${blockId}
    `;

    if (block.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    if (block[0].user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get modification history with chat details
    const history = await db`
      SELECT
        bmh.id,
        bmh.block_id as "blockId",
        bmh.chat_id as "chatId",
        bmh.user_id as "userId",
        bmh.modification_type as "modificationType",
        bmh.modified_at as "modifiedAt",
        c.title as "chatTitle"
      FROM block_modification_history bmh
      LEFT JOIN chats c ON bmh.chat_id = c.id
      WHERE bmh.block_id = ${blockId}
      ORDER BY bmh.modified_at DESC
    `;

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching deliverable history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliverable history' },
      { status: 500 }
    );
  }
}
