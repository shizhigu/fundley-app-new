#!/usr/bin/env node
/**
 * Copy existing LaTeX metrics to all users
 *
 * This script:
 * 1. Finds all existing metrics (from one user)
 * 2. Copies them to all other users
 * 3. Preserves all metric properties except user_id
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function copyMetricsToAllUsers() {
  console.log('🚀 Starting metrics copy process...\n');

  try {
    // Step 1: Get all users
    const users = await sql`
      SELECT id, email
      FROM users
      ORDER BY created_at
    `;
    console.log(`📊 Found ${users.length} users`);

    // Step 2: Get all existing metrics (from any user)
    const sourceMetrics = await sql`
      SELECT
        name,
        description,
        latex_code,
        formula,
        metric_type,
        is_active,
        created_by
      FROM latex_metrics
      WHERE is_active = true
      ORDER BY created_at
      LIMIT 20
    `;
    console.log(`📝 Found ${sourceMetrics.length} source metrics to copy\n`);

    if (sourceMetrics.length === 0) {
      console.log('⚠️  No metrics found to copy. Exiting.');
      return;
    }

    // Step 3: Check which users already have metrics
    const usersWithMetrics = await sql`
      SELECT DISTINCT user_id
      FROM latex_metrics
      WHERE is_active = true
    `;
    const userIdsWithMetrics = new Set(usersWithMetrics.map(u => u.user_id));
    console.log(`✅ ${userIdsWithMetrics.size} users already have metrics`);

    // Step 4: Copy metrics to users who don't have them yet
    let copiedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (userIdsWithMetrics.has(user.id)) {
        console.log(`⏭️  Skipping ${user.email} (already has metrics)`);
        skippedCount++;
        continue;
      }

      console.log(`📋 Copying metrics to ${user.email}...`);

      for (const metric of sourceMetrics) {
        await sql`
          INSERT INTO latex_metrics (
            id,
            user_id,
            name,
            description,
            latex_code,
            formula,
            metric_type,
            is_active,
            created_by,
            created_at,
            updated_at
          )
          VALUES (
            uuid_generate_v4(),
            ${user.id},
            ${metric.name},
            ${metric.description},
            ${metric.latex_code},
            ${metric.formula},
            ${metric.metric_type || 'ratio'},
            ${metric.is_active},
            ${user.id},
            NOW(),
            NOW()
          )
        `;
        copiedCount++;
      }

      console.log(`   ✅ Copied ${sourceMetrics.length} metrics`);
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(50));
    console.log('✨ Copy process completed!');
    console.log(`📊 Total users: ${users.length}`);
    console.log(`📝 Source metrics: ${sourceMetrics.length}`);
    console.log(`✅ Users skipped (already have metrics): ${skippedCount}`);
    console.log(`📋 Total metrics copied: ${copiedCount}`);
    console.log('='.repeat(50));

    // Step 6: Verify
    const finalCount = await sql`
      SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as users
      FROM latex_metrics
      WHERE is_active = true
    `;
    console.log(`\n🔍 Verification:`);
    console.log(`   Total active metrics: ${finalCount[0].total}`);
    console.log(`   Users with metrics: ${finalCount[0].users}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
copyMetricsToAllUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
