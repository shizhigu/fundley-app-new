import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';

/**
 * Convex functions for financial metrics management
 */

// Search metrics with filtering
export const search = query({
  args: {
    query: v.optional(v.string()),        // Search keywords
    category: v.optional(v.string()),     // Category filter
    includeBuiltIn: v.optional(v.boolean()), // Include built-in metrics
    includeCustom: v.optional(v.boolean()),  // Include custom metrics
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError('Authentication required');
    }

    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError('User not found');
    }

    let metricsQuery = ctx.db.query('metrics');

    // Apply filters
    const metrics = await metricsQuery.collect();
    
    const filtered = metrics.filter((metric) => {
      // Filter by built-in/custom preference
      if (args.includeBuiltIn === false && metric.isBuiltIn) return false;
      if (args.includeCustom === false && !metric.isBuiltIn) return false;
      
      // For custom metrics, check visibility
      if (!metric.isBuiltIn) {
        // Show if: user owns it, or it's public, or it's org-shared
        const canAccess = 
          metric.userId === user._id ||
          metric.isPublic ||
          (metric.organizationId && metric.organizationId === user.clerkOrganizationId);
        
        if (!canAccess) return false;
      }
      
      // Category filter
      if (args.category && metric.category !== args.category) return false;
      
      // Keyword search in name and description
      if (args.query) {
        const searchTerm = args.query.toLowerCase();
        const matchesName = metric.name.toLowerCase().includes(searchTerm);
        const matchesDesc = metric.description.toLowerCase().includes(searchTerm);
        if (!matchesName && !matchesDesc) return false;
      }
      
      return true;
    });

    // Sort: built-in first, then by name
    const sorted = filtered.sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) {
        return a.isBuiltIn ? -1 : 1; // Built-in first
      }
      return a.name.localeCompare(b.name);
    });

    return {
      metrics: sorted.map((metric) => ({
        id: metric._id,
        name: metric.name,
        description: metric.description,
        category: metric.category,
        formula: metric.formula,
        calculationType: metric.calculationType,
        isBuiltIn: metric.isBuiltIn,
        isPublic: metric.isPublic,
        createdAt: metric.createdAt,
        // Only include ownership info for custom metrics
        ...(metric.isBuiltIn ? {} : { 
          isOwned: metric.userId === user._id 
        })
      })),
      totalCount: sorted.length
    };
  },
});

// Get single metric by ID
export const getById = query({
  args: { metricId: v.id('metrics') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError('Authentication required');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError('User not found');
    }

    const metric = await ctx.db.get(args.metricId);
    if (!metric) {
      throw new ConvexError('Metric not found');
    }

    // Check access permissions
    if (!metric.isBuiltIn) {
      const canAccess = 
        metric.userId === user._id ||
        metric.isPublic ||
        (metric.organizationId && metric.organizationId === user.clerkOrganizationId);
      
      if (!canAccess) {
        throw new ConvexError('Access denied');
      }
    }

    return {
      id: metric._id,
      name: metric.name,
      description: metric.description,
      category: metric.category,
      formula: metric.formula,
      astDefinition: metric.astDefinition,
      dataRequirements: metric.dataRequirements,
      isBuiltIn: metric.isBuiltIn,
      isPublic: metric.isPublic,
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt,
      isOwned: metric.userId === user._id
    };
  },
});

// Create new custom metric
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    formula: v.string(),
    calculationType: v.union(v.literal("single_period"), v.literal("ttm"), v.literal("multi_period")),
    prompt: v.optional(v.string()),      // Backward compatibility
    astDefinition: v.optional(v.any()),  // JSON AST structure - optional for now
    dataRequirements: v.optional(v.object({
      income_statement: v.optional(v.array(v.string())),
      balance_sheet: v.optional(v.array(v.string())),
      cash_flow_statement: v.optional(v.array(v.string())),
      periods_needed: v.array(v.string())
    })),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError('Authentication required');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError('User not found');
    }

    // Check for duplicate names (for this user)
    const existingMetric = await ctx.db
      .query('metrics')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first();

    if (existingMetric) {
      throw new ConvexError(`Metric with name "${args.name}" already exists`);
    }

    const now = Date.now();
    
    const metricId = await ctx.db.insert('metrics', {
      name: args.name,
      description: args.description,
      category: args.category,
      formula: args.formula,
      calculationType: args.calculationType,
      astDefinition: args.astDefinition || null,
      dataRequirements: args.dataRequirements || {
        income_statement: [],
        balance_sheet: [],
        cash_flow_statement: [],
        periods_needed: ['annual']
      },
      userId: user._id,
      organizationId: user.clerkOrganizationId,
      isBuiltIn: false,
      isPublic: args.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return metricId;
  },
});

// Record metric usage for analytics
export const recordUsage = mutation({
  args: {
    metricId: v.id('metrics'),
    calculationTime: v.optional(v.number()),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return; // Skip recording if not authenticated
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      return; // Skip recording if user not found
    }

    await ctx.db.insert('metricUsage', {
      metricId: args.metricId,
      userId: user._id,
      usedAt: Date.now(),
      calculationTime: args.calculationTime,
      success: args.success,
    });
  },
});

// Clear all metrics (admin function)
export const clearAllMetrics = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all metrics
    const allMetrics = await ctx.db.query('metrics').collect();
    
    // Delete each one
    for (const metric of allMetrics) {
      await ctx.db.delete(metric._id);
    }
    
    return `Cleared ${allMetrics.length} metrics from database`;
  },
});

// Seed built-in metrics (admin function)
export const seedBuiltInMetrics = mutation({
  args: {},
  handler: async (ctx) => {
    // This should only be called during setup/migration
    const builtInMetrics = [
      {
        name: 'Alpha-1',
        description: 'EPS to Revenue efficiency ratio - measures earnings per share relative to revenue',
        category: 'profitability',
        formula: 'EPS / Revenue',
        calculationType: 'ttm' as const,
        sqlTemplate: `
          SELECT 
            symbol, 
            fiscalYear, 
            period, 
            (eps / NULLIF(revenue, 0)) AS metric_value,
            '{{metricName}}' AS metric_name
          FROM income_statement 
          WHERE symbol IN ({{symbols}}) 
          ORDER BY symbol, fiscalYear DESC, period DESC 
          LIMIT {{limit}}
        `,
      },
      {
        name: 'Return on Equity',
        description: 'Net income divided by shareholders equity - measures profitability relative to equity',
        category: 'profitability',
        formula: 'Net Income / Shareholders Equity',
        calculationType: 'ttm' as const,
        sqlTemplate: `
          SELECT 
            i.symbol,
            i.fiscalYear,
            i.period,
            (i.netIncome / NULLIF(b.totalStockholdersEquity, 0)) AS metric_value,
            '{{metricName}}' AS metric_name
          FROM income_statement i
          JOIN balance_sheet b ON i.symbol = b.symbol AND i.fiscalYear = b.fiscalYear AND i.period = b.period
          WHERE i.symbol IN ({{symbols}})
          ORDER BY i.symbol, i.fiscalYear DESC, i.period DESC
          LIMIT {{limit}}
        `,
      },
      {
        name: 'Current Ratio',
        description: 'Current assets divided by current liabilities - measures short-term liquidity',
        category: 'liquidity',
        formula: 'Current Assets / Current Liabilities',
        calculationType: 'single_period' as const,
        sqlTemplate: `
          SELECT 
            symbol,
            fiscalYear,
            period,
            (totalCurrentAssets / NULLIF(totalCurrentLiabilities, 0)) AS metric_value,
            '{{metricName}}' AS metric_name
          FROM balance_sheet
          WHERE symbol IN ({{symbols}})
          ORDER BY symbol, fiscalYear DESC, period DESC
          LIMIT {{limit}}
        `,
      }
    ];

    const now = Date.now();
    
    for (const metric of builtInMetrics) {
      // Check if already exists
      const existing = await ctx.db
        .query('metrics')
        .withIndex('by_name', (q) => q.eq('name', metric.name))
        .filter((q) => q.eq(q.field('isBuiltIn'), true))
        .first();

      if (!existing) {
        await ctx.db.insert('metrics', {
          ...metric,
          userId: undefined,
          organizationId: undefined,
          isBuiltIn: true,
          isPublic: true,
          astDefinition: null, // Built-in metrics use SQL templates instead of AST
          dataRequirements: {
            income_statement: [],
            balance_sheet: [],
            cash_flow_statement: [],
            periods_needed: ['annual']
          },
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return 'Built-in metrics seeded successfully';
  },
});

// Get user's custom metrics (similar to customMetrics.getByUser)
export const getByUser = query({
  args: {
    includePublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const metrics = await ctx.db.query('metrics').collect();
    
    const filtered = metrics.filter((metric) => {
      // Only show custom metrics for this function
      if (metric.isBuiltIn) return false;
      
      // Show if: user owns it, or it's public (if includePublic), or it's org-shared
      const canAccess = 
        metric.userId === user._id ||
        (args.includePublic && metric.isPublic) ||
        (metric.organizationId && metric.organizationId === user.clerkOrganizationId);
      
      return canAccess;
    });

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update existing custom metric
export const update = mutation({
  args: {
    id: v.id('metrics'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    formula: v.optional(v.string()),
    astDefinition: v.optional(v.any()),
    dataRequirements: v.optional(v.object({
      income_statement: v.optional(v.array(v.string())),
      balance_sheet: v.optional(v.array(v.string())),
      cash_flow_statement: v.optional(v.array(v.string())),
      periods_needed: v.array(v.string())
    })),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError('Authentication required');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError('User not found');
    }

    const metric = await ctx.db.get(args.id);
    if (!metric) {
      throw new ConvexError('Metric not found');
    }

    // Check permissions
    const canEdit = metric.userId === user._id || 
                   (metric.organizationId && metric.organizationId === user.clerkOrganizationId);
    
    if (!canEdit) {
      throw new ConvexError('Permission denied');
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.formula !== undefined) updates.formula = args.formula;
    if (args.astDefinition !== undefined) updates.astDefinition = args.astDefinition;
    if (args.dataRequirements !== undefined) updates.dataRequirements = args.dataRequirements;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.id, updates);
    
    return args.id;
  },
});

// Remove/delete a custom metric
export const remove = mutation({
  args: {
    id: v.id('metrics'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError('Authentication required');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError('User not found');
    }

    const metric = await ctx.db.get(args.id);
    if (!metric) {
      throw new ConvexError('Metric not found');
    }

    // Check permissions (only owner or same org can delete)
    const canDelete = metric.userId === user._id || 
                     (metric.organizationId && metric.organizationId === user.clerkOrganizationId);
    
    if (!canDelete) {
      throw new ConvexError('Permission denied');
    }

    await ctx.db.delete(args.id);
    
    // Also delete any usage records
    const usageRecords = await ctx.db
      .query('metricUsage')
      .withIndex('by_metric', (q) => q.eq('metricId', args.id))
      .collect();
    
    for (const record of usageRecords) {
      await ctx.db.delete(record._id);
    }

    return true;
  },
});