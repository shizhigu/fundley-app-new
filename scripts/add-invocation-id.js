// 添加 invocation_id 字段迁移脚本
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function addInvocationId() {
  try {
    console.log('🚀 Adding invocation_id column to messages table...');

    // 添加 invocation_id 列
    await sql`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS invocation_id UUID;
    `;

    console.log('✅ Added invocation_id column');

    // 创建索引
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_invocation_id ON messages(invocation_id);
    `;

    console.log('✅ Created index for invocation_id');

    // 验证字段是否添加成功
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'invocation_id';
    `;

    if (result.length > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('   Column:', result[0].column_name, 'Type:', result[0].data_type);
    } else {
      console.log('❌ Migration failed - column not found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

addInvocationId();