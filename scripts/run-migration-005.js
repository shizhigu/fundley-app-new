#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Simplifying analysis_blocks table...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const db = neon(process.env.DATABASE_URL);

  try {
    // Check if table exists
    const exists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'analysis_blocks'
      ) as exists
    `;

    if (exists[0].exists) {
      console.log('⚠️  Dropping existing table...');
      await db`DROP TABLE IF EXISTS analysis_blocks CASCADE`;
    }

    // Create simplified table
    console.log('📊 Creating simplified table...');
    await db`
      CREATE TABLE analysis_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL,
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create indexes
    console.log('📑 Creating indexes...');
    await db`CREATE INDEX idx_analysis_blocks_chat_id ON analysis_blocks(chat_id)`;
    await db`CREATE INDEX idx_analysis_blocks_created_at ON analysis_blocks(created_at DESC)`;

    // Verify
    const columns = await db`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'analysis_blocks'
      ORDER BY ordinal_position
    `;

    console.log('\n✅ Table structure:');
    console.table(columns);

    console.log('\n✨ Migration completed! Table is now super simple.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();