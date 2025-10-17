import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// PATCH /api/blocks/[id]/pin - Toggle pin status
export async function PATCH(
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
    const body = await request.json();
    const { isPinned } = body;

    if (typeof isPinned !== 'boolean') {
      return NextResponse.json(
        { error: 'isPinned must be a boolean' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingBlock = await db`
      SELECT user_id FROM analysis_blocks WHERE id = ${blockId}
    `;

    if (existingBlock.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    if (existingBlock[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update pin status
    const updated = await db`
      UPDATE analysis_blocks
      SET
        is_pinned = ${isPinned},
        pinned_at = ${isPinned ? 'NOW()' : null}
      WHERE id = ${blockId}
      RETURNING
        id,
        user_id as "userId",
        chat_id as "chatId",
        source_chat_id as "sourceChatId",
        created_at as "createdAt",
        updated_at as "updatedAt",
        is_pinned as "isPinned",
        pinned_at as "pinnedAt",
        content
    `;

    console.log(`📌 Block ${isPinned ? 'pinned' : 'unpinned'}:`, blockId);

    return NextResponse.json({ block: updated[0] });
  } catch (error) {
    console.error('Error toggling pin status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle pin status' },
      { status: 500 }
    );
  }
}
