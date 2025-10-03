#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyBlocks() {
  const db = neon(process.env.DATABASE_URL);

  const blocks = await db`
    SELECT
      id,
      chat_id,
      content,
      created_at
    FROM analysis_blocks
    ORDER BY created_at DESC
    LIMIT 4
  `;

  console.log(`Found ${blocks.length} blocks:\n`);

  blocks.forEach(block => {
    const title = block.content.title ||
                 block.content.analysis_name ||
                 block.content.name ||
                 'Untitled';
    console.log(`📊 ${title}`);
    console.log(`   ID: ${block.id.substring(0, 8)}...`);
    console.log(`   Created: ${block.created_at.toLocaleString()}`);
    console.log(`   Fields: ${Object.keys(block.content).join(', ')}\n`);
  });
}

verifyBlocks();