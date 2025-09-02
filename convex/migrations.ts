import { mutation } from './_generated/server';

/**
 * Migration: Move data from customMetrics table to unified metrics table
 */
export const migrateCustomMetricsToMetrics = mutation({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Starting migration from customMetrics to metrics table...');
    
    // Get all custom metrics from old table
    const customMetrics = await ctx.db.query('customMetrics').collect();
    console.log(`📊 Found ${customMetrics.length} custom metrics to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const oldMetric of customMetrics) {
      try {
        // Check if metric already exists in new table (by name and userId)
        const existingMetric = await ctx.db
          .query('metrics')
          .withIndex('by_name', (q) => q.eq('name', oldMetric.name))
          .filter((q) => q.eq(q.field('userId'), oldMetric.userId))
          .first();
          
        if (existingMetric) {
          console.log(`⏭️  Skipping "${oldMetric.name}" - already exists in metrics table`);
          skippedCount++;
          continue;
        }
        
        // Extract SQL template from formula object
        let sqlTemplate = '';
        let calculationType = 'ttm';
        let actualFormula = oldMetric.name;
        
        if (typeof oldMetric.formula === 'object' && oldMetric.formula !== null) {
          const formulaObj = oldMetric.formula as any;
          sqlTemplate = formulaObj.sqlTemplate || '';
          calculationType = formulaObj.calculationType || 'ttm';
          actualFormula = formulaObj.formula || formulaObj.userRequirement || oldMetric.name;
        } else if (typeof oldMetric.formula === 'string') {
          actualFormula = oldMetric.formula;
        }
        
        // Insert into new metrics table
        await ctx.db.insert('metrics', {
          name: oldMetric.name,
          description: oldMetric.description,
          category: oldMetric.category === 'custom' ? 'profitability' : oldMetric.category, // Default category
          formula: actualFormula,
          sqlTemplate: sqlTemplate,
          calculationType: calculationType,
          userId: oldMetric.userId,
          organizationId: undefined, // Will be set based on user's org
          isBuiltIn: false,
          isPublic: oldMetric.isPublic || false,
          createdAt: oldMetric.createdAt,
          updatedAt: oldMetric.updatedAt,
        });
        
        console.log(`✅ Migrated "${oldMetric.name}"`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate "${oldMetric.name}":`, error);
      }
    }
    
    console.log(`🎉 Migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
    
    return {
      success: true,
      migrated: migratedCount,
      skipped: skippedCount,
      total: customMetrics.length
    };
  },
});

/**
 * Clean up old customMetrics table after successful migration
 * WARNING: This will delete all data in customMetrics table!
 */
export const cleanupOldCustomMetrics = mutation({
  args: {},
  handler: async (ctx) => {
    console.log('🧹 Starting cleanup of old customMetrics table...');
    
    const customMetrics = await ctx.db.query('customMetrics').collect();
    let deletedCount = 0;
    
    for (const metric of customMetrics) {
      await ctx.db.delete(metric._id);
      deletedCount++;
    }
    
    console.log(`🗑️  Deleted ${deletedCount} records from customMetrics table`);
    
    return {
      success: true,
      deleted: deletedCount
    };
  },
});