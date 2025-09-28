import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/config';

export async function POST(request: NextRequest) {
  try {
    console.log('Adding tool_call_id field to messages table...');

    // 添加字段
    await db`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS tool_call_id TEXT
    `;

    // 创建索引
    await db`
      CREATE INDEX IF NOT EXISTS idx_messages_tool_call_id
      ON messages(tool_call_id)
    `;

    console.log('✅ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'tool_call_id field added successfully'
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}