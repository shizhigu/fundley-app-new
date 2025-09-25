#!/usr/bin/env node
/**
 * 数据库迁移脚本 - 创建新的 messages 表
 *
 * 功能：
 * 1. 保留 events 表给 ADK 后端使用
 * 2. 创建新的 messages 表给前端使用
 * 3. 清晰的数据结构，便于前端渲染
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function migrate() {
  try {
    console.log('🚀 Starting database migration...');

    // 执行各个迁移步骤
    console.log('📋 Dropping existing messages table...');
    await sql`DROP TABLE IF EXISTS messages CASCADE`;

    console.log('📋 Creating new messages table...');
    await sql`
      CREATE TABLE messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
          content TEXT,

          -- 工具相关字段
          tool_name TEXT,
          tool_args JSONB,
          tool_result JSONB,

          -- 元数据
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('📋 Creating indexes...');
    await sql`CREATE INDEX idx_messages_chat_id ON messages(chat_id)`;
    await sql`CREATE INDEX idx_messages_created_at ON messages(created_at)`;
    await sql`CREATE INDEX idx_messages_role ON messages(role)`;

    console.log('📋 Creating update trigger function...');
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    console.log('📋 Creating update trigger...');
    await sql`
      CREATE TRIGGER update_messages_updated_at
          BEFORE UPDATE ON messages
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
    `;

    console.log('✅ Migration completed successfully!');
    console.log('📋 Created:');
    console.log('  - New messages table for frontend');
    console.log('  - Indexes for performance');
    console.log('  - Auto-update triggers');
    console.log('💡 Events table preserved for ADK backend');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();