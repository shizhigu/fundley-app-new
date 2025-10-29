import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// POST /api/blocks/[id]/duplicate - Duplicate a block
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

    // Get original block
    const originalBlock = await db`
      SELECT * FROM deliverables WHERE id = ${blockId}
    `;

    if (originalBlock.length === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const original = originalBlock[0];

    // Create duplicate with new ID and updated title
    const duplicated = await db`
      INSERT INTO deliverables (
        id,
        user_id,
        source_chat_id,
        created_in_message_id,
        title,
        notebook_path,
        symbols,
        tags,
        description,
        is_template,
        template_category,
        content,
        chat_id,
        created_at,
        updated_at
      )
      VALUES (
        uuid_generate_v4(),
        ${userId},
        ${original.source_chat_id || null},
        ${null}, -- New block, no message reference
        ${original.title + ' (副本)'},
        ${null}, -- Will be set when notebook is created
        ${original.symbols || []},
        ${original.tags || []},
        ${original.description || null},
        ${false}, -- Duplicates are not templates by default
        ${original.template_category || null},
        ${original.content || {}},
        ${original.chat_id || null}, -- Preserve for backward compatibility
        NOW(),
        NOW()
      )
      RETURNING
        id,
        user_id as "userId",
        source_chat_id as "sourceChatId",
        created_in_message_id as "createdInMessageId",
        title,
        notebook_path as "notebookPath",
        symbols,
        tags,
        description,
        is_template as "isTemplate",
        template_category as "templateCategory",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return NextResponse.json({ block: duplicated[0] });
  } catch (error) {
    console.error('Error duplicating block:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate block' },
      { status: 500 }
    );
  }
}
