// 手动执行数据库迁移
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('🔍 Checking current table structure...');

    // 检查当前表结构
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Current messages table structure:');
    tableInfo.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // 检查是否已经有 tool_call_id 字段
    const hasToolCallId = tableInfo.some(col => col.column_name === 'tool_call_id');

    if (hasToolCallId) {
      console.log('✅ tool_call_id field already exists!');
      return;
    }

    console.log('➕ Adding tool_call_id field...');

    // 添加字段
    await sql`
      ALTER TABLE messages
      ADD COLUMN tool_call_id TEXT;
    `;

    console.log('📊 Creating index...');

    // 创建索引
    await sql`
      CREATE INDEX idx_messages_tool_call_id
      ON messages(tool_call_id);
    `;

    console.log('✅ Migration completed successfully!');

    // 验证结果
    const updatedInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position;
    `;

    console.log('📋 Updated messages table structure:');
    updatedInfo.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();