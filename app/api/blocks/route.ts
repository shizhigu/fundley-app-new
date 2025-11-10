import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/blocks - List user's deliverables
// Supports:
// - library: All user's deliverables (default)
// - contextual: Deliverables from specific chat (optional filter via chatId param)
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
    const includeContent = searchParams.get('includeContent') === 'true'; // Memory optimization

    console.log('📦 GET /api/blocks - userId:', userId, 'chatId:', chatId, 'includeContent:', includeContent);

    // Get all user deliverables with modification history
    // Note: updated_at is auto-updated by trigger when block_modification_history is inserted
    // Pinned deliverables are sorted first, then by updated_at/created_at
    // Memory optimization: only fetch full content when requested
    const contentField = includeContent
      ? db`d.content`
      : db`jsonb_build_object('title', d.content->'title', 'text', LEFT(COALESCE(d.content->>'text', ''), 200))`;

    let blocks = await db`
      SELECT
        d.id,
        d.chat_id as "chatId",
        d.user_id as "userId",
        d.source_chat_id as "sourceChatId",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        d.is_pinned as "isPinned",
        d.pinned_at as "pinnedAt",
        d.primary_symbol as "primarySymbol",
        d.opened,
        ${contentField} as content,
        c.title as "sourceChatTitle",
        -- Get list of chats that modified this deliverable
        COALESCE(
          (
            SELECT array_agg(DISTINCT bmh.chat_id)
            FROM block_modification_history bmh
            WHERE bmh.deliverable_id = d.id
          ),
          ARRAY[]::uuid[]
        ) as "modifiedInChats"
      FROM deliverables d
      LEFT JOIN chats c ON d.source_chat_id = c.id
      WHERE d.user_id = ${userId}
      ORDER BY
        d.is_pinned DESC,
        d.pinned_at DESC NULLS LAST,
        d.updated_at DESC NULLS LAST,
        d.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    console.log('📦 Found', blocks.length, 'deliverables');

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
        updatedAt: block.updatedAt,
        isPinned: block.isPinned || false,
        pinnedAt: block.pinnedAt,
        primarySymbol: block.primarySymbol,
        opened: block.opened || false, // 已读状态
        content: block.content,
        // Computed fields for UI
        title,
        textPreview,
        sourceChatTitle: block.sourceChatTitle || 'Unknown Chat',
        modifiedInChats: block.modifiedInChats || [], // Array of chat IDs that modified this block
        // Legacy field names for backward compatibility
        created_at: block.createdAt,
        updated_at: block.updatedAt,
        chat_id: block.sourceChatId || block.chatId,
        primary_symbol: block.primarySymbol,
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

// POST /api/blocks - Create new deliverable (usually done by Python tools)
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

    // Create new deliverable
    const newBlock = await db`
      INSERT INTO deliverables (
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
    console.error('Error creating deliverable:', error);
    return NextResponse.json(
      { error: 'Failed to create deliverable' },
      { status: 500 }
    );
  }
}
