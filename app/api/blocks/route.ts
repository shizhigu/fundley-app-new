import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/blocks - List user's analysis blocks
// Supports:
// - library: All user's blocks (default)
// - contextual: Blocks from specific chat (optional filter via chatId param)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId'); // Optional: filter by chat
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    console.log('📦 GET /api/blocks - userId:', userId, 'chatId:', chatId);

    // Get all user blocks with modification history
    let blocks = await db`
      SELECT
        ab.id,
        ab.chat_id as "chatId",
        ab.user_id as "userId",
        ab.source_chat_id as "sourceChatId",
        
        ab.created_at as "createdAt",
        ab.content,
        c.title as "sourceChatTitle",
        -- Get list of chats that modified this block
        COALESCE(
          (
            SELECT array_agg(DISTINCT bmh.chat_id)
            FROM block_modification_history bmh
            WHERE bmh.block_id = ab.id
          ),
          ARRAY[]::uuid[]
        ) as "modifiedInChats"
      FROM analysis_blocks ab
      LEFT JOIN chats c ON ab.source_chat_id = c.id
      WHERE ab.user_id = ${userId}
      ORDER BY ab.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    console.log('📦 Found', blocks.length, 'blocks');

    // Transform to include computed fields
    const transformedBlocks = blocks.map((block: any) => {
      // Extract title and text from content JSONB
      const title = block.content?.title || 'Untitled Analysis';
      const text = block.content?.text || '';
      const textPreview = text.substring(0, 150);

      return {
        id: block.id,
        userId: block.userId,
        sourceChatId: block.sourceChatId || block.chatId, // Fallback for legacy data
        
        createdAt: block.createdAt,
        content: block.content,
        // Computed fields for UI
        title,
        textPreview,
        sourceChatTitle: block.sourceChatTitle || 'Unknown Chat',
        modifiedInChats: block.modifiedInChats || [], // Array of chat IDs that modified this block
        // Legacy field names for backward compatibility
        created_at: block.createdAt,
        chat_id: block.sourceChatId || block.chatId,
      };
    });

    return NextResponse.json({ blocks: transformedBlocks });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocks' },
      { status: 500 }
    );
  }
}

// POST /api/blocks - Create new analysis block (usually done by Python tools)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      sourceChatId,
      content,
    } = body;

    if (!content || !content.title) {
      return NextResponse.json(
        { error: 'content with title is required' },
        { status: 400 }
      );
    }

    // Create new block
    const newBlock = await db`
      INSERT INTO analysis_blocks (
        user_id,
        chat_id,
        source_chat_id,
        content,
        created_at
      )
      VALUES (
        ${userId},
        ${sourceChatId || null},
        ${sourceChatId || null},
        ${JSON.stringify(content)},
        NOW()
      )
      RETURNING
        id,
        user_id as "userId",
        chat_id as "chatId",
        source_chat_id as "sourceChatId",
        created_at as "createdAt",
        content
    `;

    return NextResponse.json({ block: newBlock[0] });
  } catch (error) {
    console.error('Error creating block:', error);
    return NextResponse.json(
      { error: 'Failed to create block' },
      { status: 500 }
    );
  }
}
