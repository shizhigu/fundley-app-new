#!/usr/bin/env node
/**
 * 数据库迁移脚本：为messages表添加attachments支持
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// 加载环境变量
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log('🚀 Starting attachments migration...');

    // 读取迁移SQL
    const migrationPath = join(__dirname, '../lib/db/migrations/add-attachments-to-messages.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // 执行迁移 - 分步执行每个SQL语句
    console.log('📝 Executing migration SQL...');

    // 添加attachments列
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'`;

    // 添加索引
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments)`;

    // 添加注释
    await sql`COMMENT ON COLUMN messages.attachments IS 'Array of attachment metadata objects containing name, contentType, url, size, etc.'`;

    // 验证迁移
    console.log('🔍 Verifying migration...');
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'attachments'
    `;

    if (result.length > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('📊 Column details:', result[0]);
    } else {
      console.error('❌ Migration verification failed - attachments column not found');
      process.exit(1);
    }

    // 显示表结构
    console.log('\n📋 Current messages table structure:');
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `;

    console.table(tableStructure);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();