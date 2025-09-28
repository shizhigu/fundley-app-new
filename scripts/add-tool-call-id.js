// 添加 tool_call_id 字段的迁移脚本
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(connectionString);

async function migrate() {
  try {
    console.log('Adding tool_call_id field to messages table...');

    // 添加字段
    await sql`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS tool_call_id TEXT
    `;

    // 创建索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_tool_call_id
      ON messages(tool_call_id)
    `;

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();