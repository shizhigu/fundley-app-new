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
      SELECT user_id FROM analysis_blocks WHERE id = ${blockId}
    `;

    if (existingBlock.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    if (existingBlock[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete block from database
    await db`DELETE FROM analysis_blocks WHERE id = ${blockId}`;

    // Remove from Redis block history if present
    try {
      redis = await createRedisConnection();

      const historyKey = `user:${userId}:block_history`;
      const historyStr = await redis.get(historyKey);

      if (historyStr) {
        let history: Array<{ id: string; title: string }> = [];
        try {
          history = JSON.parse(historyStr);
        } catch (e) {
          console.error('Failed to parse block history:', e);
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

      // Also clear active block if it's the one being deleted
      const activeBlockId = await redis.get(`user:${userId}:active_block_id`);
      if (activeBlockId === blockId) {
        await redis.del([
          `user:${userId}:active_block_id`,
          `user:${userId}:active_block_content`
        ]);
        console.log(`✅ Cleared active block ${blockId.slice(0, 8)}...`);
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
