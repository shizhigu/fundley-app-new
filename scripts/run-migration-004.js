#!/usr/bin/env node

/**
 * Run migration 004: Create analysis_blocks table
 *
 * Usage: node scripts/run-migration-004.js
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  console.log('🚀 Starting migration 004: Create analysis_blocks table...\n');

  // Check environment variable
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not found');
    console.error('Please ensure .env.local file exists with DATABASE_URL');
    process.exit(1);
  }

  try {
    // Connect to database
    const db = neon(process.env.DATABASE_URL);
    console.log('📊 Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', '004_create_analysis_blocks.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    console.log('📄 Migration file loaded');

    // Check if table already exists
    const tableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'analysis_blocks'
      ) as exists
    `;

    if (tableExists[0].exists) {
      console.log('⚠️  Table analysis_blocks already exists');

      // Check if we should drop and recreate (only in development)
      if (process.argv.includes('--force')) {
        console.log('🔥 Force flag detected, dropping existing table...');
        await db`DROP TABLE IF EXISTS analysis_blocks CASCADE`;
        console.log('✅ Existing table dropped');
      } else {
        console.log('ℹ️  Skipping migration (use --force to recreate)');
        return;
      }
    }

    // Run migration
    console.log('🔨 Running migration...');

    // Split the migration into individual statements and run them
    const statements = migrationSQL
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');

    for (const statement of statements) {
      if (statement.includes('CREATE') || statement.includes('COMMENT') || statement.includes('TRIGGER')) {
        await db.unsafe(statement);
      }
    }

    console.log('✅ Migration completed successfully!\n');

    // Verify table was created
    const verification = await db`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'analysis_blocks'
      ORDER BY ordinal_position
    `;

    console.log('📋 Table structure:');
    console.table(verification.map(col => ({
      Column: col.column_name,
      Type: col.data_type,
      Nullable: col.is_nullable,
      Default: col.column_default ? col.column_default.substring(0, 30) + '...' : null
    })));

    // Check indexes
    const indexes = await db`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'analysis_blocks'
    `;

    console.log('\n📑 Indexes created:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    // Create a test record to verify everything works
    if (process.argv.includes('--test')) {
      console.log('\n🧪 Creating test record...');

      // First, get a valid chat_id
      const chats = await db`
        SELECT id FROM chats LIMIT 1
      `;

      if (chats.length > 0) {
        const testBlock = await db`
          INSERT INTO analysis_blocks (
            chat_id,
            type,
            title,
            content,
            status
          ) VALUES (
            ${chats[0].id},
            'metric',
            'Test ROCE Analysis Block',
            ${JSON.stringify({
              query: "Test query",
              insights: ["Test insight 1", "Test insight 2"],
              metrics: { roce: 0.152, change: -0.073 },
              summary: "This is a test block"
            })},
            'completed'
          )
          RETURNING id, title, status
        `;

        console.log('✅ Test record created:', testBlock[0]);

        // Clean up test record
        await db`DELETE FROM analysis_blocks WHERE id = ${testBlock[0].id}`;
        console.log('🧹 Test record cleaned up');
      } else {
        console.log('⚠️  No chats found for testing, skipping test record creation');
      }
    }

    console.log('\n✨ Migration 004 completed successfully!');
    console.log('📊 Table analysis_blocks is ready for use');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error.message);

    if (error.code === 'ENOENT') {
      console.error('Migration file not found. Please ensure the file exists at:');
      console.error('lib/db/migrations/004_create_analysis_blocks.sql');
    }

    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);