#!/usr/bin/env node

/**
 * Simple migration script to create analysis_blocks table
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Starting migration: Create analysis_blocks table...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const db = neon(process.env.DATABASE_URL);

  try {
    // Drop table if forcing recreation
    if (process.argv.includes('--force')) {
      console.log('🔥 Dropping existing table...');
      await db`DROP TABLE IF EXISTS analysis_blocks CASCADE`;
    }

    // Create the table
    console.log('📊 Creating analysis_blocks table...');

    await db`
      CREATE TABLE IF NOT EXISTS analysis_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('✅ Table created\n');

    // Create indexes
    console.log('📑 Creating indexes...');

    await db`
      CREATE INDEX IF NOT EXISTS idx_analysis_blocks_chat_id_order
        ON analysis_blocks(chat_id, order_index)
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_analysis_blocks_status
        ON analysis_blocks(status)
        WHERE status IN ('pending', 'generating')
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_analysis_blocks_created_at
        ON analysis_blocks(created_at DESC)
    `;

    console.log('✅ Indexes created\n');

    // Create update trigger
    console.log('⚙️ Creating update trigger...');

    await db`
      CREATE OR REPLACE FUNCTION update_analysis_blocks_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    await db`
      DROP TRIGGER IF EXISTS trigger_update_analysis_blocks_updated_at ON analysis_blocks
    `;

    await db`
      CREATE TRIGGER trigger_update_analysis_blocks_updated_at
        BEFORE UPDATE ON analysis_blocks
        FOR EACH ROW
        EXECUTE FUNCTION update_analysis_blocks_updated_at()
    `;

    console.log('✅ Trigger created\n');

    // Verify the table structure
    const columns = await db`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'analysis_blocks'
      ORDER BY ordinal_position
    `;

    console.log('📋 Table structure:');
    console.table(columns);

    // Test with sample data if requested
    if (process.argv.includes('--test')) {
      console.log('\n🧪 Testing with sample data...');

      // Get a chat ID for testing
      const chats = await db`SELECT id FROM chats LIMIT 1`;

      if (chats.length > 0) {
        const result = await db`
          INSERT INTO analysis_blocks (chat_id, type, title, content)
          VALUES (
            ${chats[0].id},
            'metric',
            'Test Block',
            ${JSON.stringify({
              query: "Test query",
              insights: ["Insight 1", "Insight 2"],
              metrics: { value: 123 }
            })}::jsonb
          )
          RETURNING id, title, content
        `;

        console.log('✅ Test insert successful:', result[0].title);

        // Clean up
        await db`DELETE FROM analysis_blocks WHERE id = ${result[0].id}`;
        console.log('🧹 Test data cleaned up');
      } else {
        console.log('⚠️  No chats found for testing');
      }
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('📊 Table analysis_blocks is ready for use');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);

    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists. Use --force to recreate.');
    } else {
      console.error('Full error:', error);
    }

    process.exit(1);
  }
}

// Run migration
runMigration().catch(console.error);