import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';
import { createClient } from 'redis';

/**
 * Create a new Redis client and connect
 */
async function createRedisConnection() {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.once('error', (err) => {
    if (!err.message.includes('Socket closed')) {
      console.error('Redis Client Error:', err);
    }
  });

  await client.connect();
  return client;
}

// GET /api/blocks/[id] - Get single deliverable with full content (on-demand loading)
export async function GET(
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

    console.log(`📦 GET /api/blocks/${blockId} - Fetching full content on-demand`);

    // Fetch full deliverable with content
    const blocks = await db`
      SELECT
        d.id,
        d.user_id as "userId",
        d.chat_id as "chatId",
        d.source_chat_id as "sourceChatId",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        d.is_pinned as "isPinned",
        d.pinned_at as "pinnedAt",
        d.primary_symbol as "primarySymbol",
        d.opened,
        d.content,
        c.title as "sourceChatTitle"
      FROM deliverables d
      LEFT JOIN chats c ON d.source_chat_id = c.id
      WHERE d.id = ${blockId} AND d.user_id = ${userId}
    `;

    if (blocks.length === 0) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const block = blocks[0];

    // Transform to match frontend expectations
    const transformedBlock = {
      id: block.id,
      userId: block.userId,
      sourceChatId: block.sourceChatId || block.chatId,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
      isPinned: block.isPinned || false,
      pinnedAt: block.pinnedAt,
      primarySymbol: block.primarySymbol,
      opened: block.opened || false,
      content: block.content,
      title: block.content?.title || 'Untitled Analysis',
      sourceChatTitle: block.sourceChatTitle,
    };

    return NextResponse.json({ block: transformedBlock });
  } catch (error) {
    console.error('Error fetching deliverable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliverable' },
      { status: 500 }
    );
  }
}

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
      SELECT user_id FROM deliverables WHERE id = ${blockId}
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
      UPDATE deliverables
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
  let redis;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: blockId } = await params;

    // Verify ownership
    const existingBlock = await db`
      SELECT user_id FROM deliverables WHERE id = ${blockId}
    `;

    if (existingBlock.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    if (existingBlock[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete block from database
    await db`DELETE FROM deliverables WHERE id = ${blockId}`;

    // Remove from Redis deliverable history if present
    try {
      redis = await createRedisConnection();

      const historyKey = `user:${userId}:deliverable_history`;
      const historyStr = await redis.get(historyKey);

      if (historyStr) {
        let history: Array<{ id: string; title: string }> = [];
        try {
          history = JSON.parse(historyStr);
        } catch (e) {
          console.error('Failed to parse deliverable history:', e);
        }

        // Remove the deleted block from history
        const originalLength = history.length;
        history = history.filter(item => item.id !== blockId);

        // Only update if something was removed
        if (history.length < originalLength) {
          if (history.length > 0) {
            // Update history with remaining blocks
            await redis.setEx(
              historyKey,
              30 * 24 * 60 * 60, // 30 days
              JSON.stringify(history)
            );
            console.log(`✅ Removed block ${blockId.slice(0, 8)}... from history (${originalLength} → ${history.length})`);
          } else {
            // If history is now empty, delete the key
            await redis.del(historyKey);
            console.log(`✅ Removed block ${blockId.slice(0, 8)}... from history (now empty)`);
          }
        }
      }

      // Also clear active deliverable if it's the one being deleted
      const activeBlockId = await redis.get(`user:${userId}:active_deliverable_id`);
      if (activeBlockId === blockId) {
        await redis.del([
          `user:${userId}:active_deliverable_id`,
          `user:${userId}:active_deliverable_content`
        ]);
        console.log(`✅ Cleared active deliverable ${blockId.slice(0, 8)}...`);
      }
    } catch (redisError) {
      // Log but don't fail the delete operation if Redis cleanup fails
      console.error('Error cleaning up Redis data:', redisError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting block:', error);
    return NextResponse.json(
      { error: 'Failed to delete block' },
      { status: 500 }
    );
  } finally {
    // Always disconnect Redis after use
    if (redis) {
      redis.removeAllListeners();
      await redis.disconnect();
    }
  }
}
