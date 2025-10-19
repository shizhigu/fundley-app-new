import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

/**
 * Create a new Redis client and connect
 * Using one-time connections to avoid exhausting the free tier's 50 connection limit
 */
async function createRedisConnection() {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  // Use once() instead of on() to avoid memory leaks
  // Error handler will be automatically removed after first error
  client.once('error', (err) => {
    // Only log if it's a real connection error, not socket close
    if (!err.message.includes('Socket closed')) {
      console.error('Redis Client Error:', err);
    }
  });

  await client.connect();
  return client;
}

/**
 * GET /api/user/active-block
 * Get the current active block for the authenticated user
 *
 * Returns:
 *   {
 *     "block_id": "uuid" | null,
 *     "content": {...} | null
 *   }
 */
export async function GET(request: NextRequest) {
  let redis;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // Internal UUID

    // Create one-time connection
    redis = await createRedisConnection();

    // Get active block from Redis
    const blockId = await redis.get(`user:${userId}:active_block_id`);
    const contentStr = await redis.get(`user:${userId}:active_block_content`);

    let content = null;
    if (contentStr) {
      try {
        content = JSON.parse(contentStr);
      } catch (e) {
        console.error('Failed to parse block content from Redis:', e);
      }
    }

    return NextResponse.json({
      block_id: blockId,
      content: content,
    });
  } catch (error) {
    console.error('Error getting active block:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Always disconnect after use
    if (redis) {
      // Remove all listeners before disconnect to avoid "Socket closed" errors
      redis.removeAllListeners();
      await redis.disconnect();
    }
  }
}

/**
 * POST /api/user/active-block
 * Set the current active block for the authenticated user
 *
 * Body:
 *   {
 *     "block_id": "uuid",
 *     "content": {...},
 *     "title": "Block Title" (optional, for history)
 *   }
 *
 * Returns:
 *   { "success": true }
 */
export async function POST(request: NextRequest) {
  let redis;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // Internal UUID

    const body = await request.json();
    const { block_id, content, title } = body;

    if (!block_id) {
      return NextResponse.json(
        { error: 'block_id is required' },
        { status: 400 }
      );
    }

    // Create one-time connection
    redis = await createRedisConnection();

    // Set active block in Redis (7 day expiry)
    const expirySeconds = 7 * 24 * 60 * 60; // 7 days

    await redis.setEx(
      `user:${userId}:active_block_id`,
      expirySeconds,
      block_id
    );

    if (content) {
      await redis.setEx(
        `user:${userId}:active_block_content`,
        expirySeconds,
        JSON.stringify(content)
      );
    }

    // Add to block history if title is provided
    if (title) {
      const historyKey = `user:${userId}:block_history`;
      const historyStr = await redis.get(historyKey);

      let history: Array<{ id: string; title: string }> = [];
      if (historyStr) {
        try {
          history = JSON.parse(historyStr);
        } catch (e) {
          console.error('Failed to parse block history:', e);
        }
      }

      // Remove if already exists (deduplication)
      history = history.filter(item => item.id !== block_id);

      // Add to front (most recent)
      history.unshift({ id: block_id, title });

      // Keep only top 5
      history = history.slice(0, 5);

      // Save back to Redis (30 day expiry)
      await redis.setEx(
        historyKey,
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify(history)
      );
    }

    console.log(`✅ Set active block for user ${userId.slice(0, 8)}... → ${block_id.slice(0, 8)}...`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting active block:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Always disconnect after use
    if (redis) {
      // Remove all listeners before disconnect to avoid "Socket closed" errors
      redis.removeAllListeners();
      await redis.disconnect();
    }
  }
}

/**
 * DELETE /api/user/active-block
 * Clear the current active block for the authenticated user
 *
 * Returns:
 *   { "success": true }
 */
export async function DELETE(request: NextRequest) {
  let redis;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // Internal UUID

    // Create one-time connection
    redis = await createRedisConnection();

    // Delete from Redis
    await redis.del([
      `user:${userId}:active_block_id`,
      `user:${userId}:active_block_content`
    ]);

    console.log(`✅ Cleared active block for user ${userId.slice(0, 8)}...`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing active block:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Always disconnect after use
    if (redis) {
      // Remove all listeners before disconnect to avoid "Socket closed" errors
      redis.removeAllListeners();
      await redis.disconnect();
    }
  }
}
