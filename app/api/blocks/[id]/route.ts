import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// PATCH /api/blocks/[id] - Update block
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
    const updates = await request.json();

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

    // For content updates, we only need to update the content field
    // since title, sections, etc. are stored within the content JSONB
    if (!updates.content) {
      return NextResponse.json(
        { error: 'Content field is required' },
        { status: 400 }
      );
    }

    // Perform update
    const updated = await db`
      UPDATE analysis_blocks
      SET content = ${JSON.stringify(updates.content)}
      WHERE id = ${blockId}
      RETURNING
        id,
        user_id as "userId",
        chat_id as "chatId",
        source_chat_id as "sourceChatId",
        created_at as "createdAt",
        content,
        primary_symbol
    `;

    return NextResponse.json({ block: updated[0] });
  } catch (error) {
    console.error('Error updating block:', error);
    return NextResponse.json(
      { error: 'Failed to update block' },
      { status: 500 }
    );
  }
}

// DELETE /api/blocks/[id] - Delete block
export async function DELETE(
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

    // Delete block
    await db`DELETE FROM analysis_blocks WHERE id = ${blockId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting block:', error);
    return NextResponse.json(
      { error: 'Failed to delete block' },
      { status: 500 }
    );
  }
}
