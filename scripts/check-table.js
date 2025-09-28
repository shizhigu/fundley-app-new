// 检查数据库表结构
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function checkTable() {
  try {
    console.log('🔍 Checking DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Not set ❌');

    // 检查所有表
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `;

    console.log('📋 Available tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // 检查 messages 表结构
    console.log('\n🔍 Checking messages table structure...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'messages' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    if (columns.length === 0) {
      console.log('❌ No messages table found!');
      return;
    }

    console.log('📋 Messages table columns:');
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // 检查索引
    console.log('\n🔍 Checking indexes...');
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'messages';
    `;

    console.log('📋 Messages table indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
    });

    // 检查是否有数据
    const count = await sql`
      SELECT COUNT(*) as total FROM messages;
    `;

    console.log(`\n📊 Total messages: ${count[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTable();