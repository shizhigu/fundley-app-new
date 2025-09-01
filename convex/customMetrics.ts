import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

/**
 * Create a new custom financial metric
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    formula: v.any(), // FormulaAST JSON structure
    prompt: v.string(), // Generated LLM instruction
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get user information to find their organization
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    const metricId = await ctx.db.insert("customMetrics", {
      name: args.name,
      description: args.description,
      category: args.category,
      formula: args.formula,
      prompt: args.prompt,
      userId,
      organizationId: user.clerkOrganizationId, // Share within organization
      isPublic: args.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return metricId;
  },
});

/**
 * Update an existing custom metric
 */
export const update = mutation({
  args: {
    id: v.id("customMetrics"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    formula: v.optional(v.any()),
    prompt: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Metric not found");
    }

    // Check permissions (owner or same organization)
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const canEdit = existing.userId === userId || 
                   (existing.organizationId && existing.organizationId === user.clerkOrganizationId);
    
    if (!canEdit) {
      throw new Error("Permission denied");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.formula !== undefined) updates.formula = args.formula;
    if (args.prompt !== undefined) updates.prompt = args.prompt;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.id, updates);
    
    return args.id;
  },
});

/**
 * Delete a custom metric
 */
export const remove = mutation({
  args: {
    id: v.id("customMetrics"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Metric not found");
    }

    // Check permissions (owner or same organization)
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const canDelete = existing.userId === userId || 
                     (existing.organizationId && existing.organizationId === user.clerkOrganizationId);
    
    if (!canDelete) {
      throw new Error("Permission denied");
    }

    await ctx.db.delete(args.id);
    
    // Also delete any usage records
    const usageRecords = await ctx.db
      .query("formulaUsage")
      .withIndex("by_metric", (q) => q.eq("metricId", args.id))
      .collect();
    
    for (const record of usageRecords) {
      await ctx.db.delete(record._id);
    }

    return true;
  },
});

/**
 * Get all custom metrics for the authenticated user and their organization
 */
export const getByUser = query({
  args: {
    includePublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get user information to find their organization
    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    const userOrganizationId = user.clerkOrganizationId;

    // Get metrics accessible to this user
    let accessibleMetrics = [];

    if (userOrganizationId) {
      // Get organization-wide metrics
      const organizationMetrics = await ctx.db
        .query("customMetrics")
        .withIndex("by_organization", (q) => q.eq("organizationId", userOrganizationId))
        .collect();
      accessibleMetrics.push(...organizationMetrics);
    } else {
      // Get user's personal metrics (when no organization)
      const userMetrics = await ctx.db
        .query("customMetrics")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("organizationId"), undefined))
        .collect();
      accessibleMetrics.push(...userMetrics);
    }

    if (args.includePublic) {
      // Also get public metrics from other organizations/users
      const publicMetrics = await ctx.db
        .query("customMetrics")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .filter((q) => 
          userOrganizationId 
            ? q.neq(q.field("organizationId"), userOrganizationId)
            : q.neq(q.field("userId"), userId)
        )
        .collect();
      accessibleMetrics.push(...publicMetrics);
    }

    // Remove duplicates and sort
    const uniqueMetrics = Array.from(
      new Map(accessibleMetrics.map(m => [m._id, m])).values()
    );

    return uniqueMetrics.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get metrics by category
 */
export const getByCategory = query({
  args: {
    category: v.string(),
    includePublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const metrics = await ctx.db
      .query("customMetrics")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => 
        q.or(
          q.eq(q.field("userId"), userId),
          args.includePublic ? q.eq(q.field("isPublic"), true) : q.eq(q.field("isPublic"), false)
        )
      )
      .collect();

    return metrics.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a single metric by ID
 */
export const getById = query({
  args: {
    id: v.id("customMetrics"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    const metric = await ctx.db.get(args.id);
    if (!metric) {
      return null;
    }

    if (userId) {
      const user = await ctx.db.get(userId);
      if (user) {
        // Check if user can access this metric (owner, same organization, or public)
        const canAccess = metric.userId === userId || 
                         (metric.organizationId && metric.organizationId === user.clerkOrganizationId) ||
                         metric.isPublic;
        
        if (!canAccess) {
          throw new Error("Permission denied");
        }
        
        return metric;
      }
    }

    // If no user authentication, only return public metrics
    if (!metric.isPublic) {
      throw new Error("Permission denied");
    }

    return metric;
  },
});

/**
 * Record usage of a custom metric
 */
export const recordUsage = mutation({
  args: {
    metricId: v.id("customMetrics"),
    calculationTime: v.optional(v.number()),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Verify the metric exists and user can access it
    const metric = await ctx.db.get(args.metricId);
    if (!metric) {
      throw new Error("Metric not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const canAccess = metric.userId === userId || 
                     (metric.organizationId && metric.organizationId === user.clerkOrganizationId) ||
                     metric.isPublic;
    
    if (!canAccess) {
      throw new Error("Permission denied");
    }

    await ctx.db.insert("formulaUsage", {
      metricId: args.metricId,
      userId,
      usedAt: Date.now(),
      calculationTime: args.calculationTime,
      success: args.success,
    });

    return true;
  },
});

/**
 * Get usage statistics for a metric
 */
export const getUsageStats = query({
  args: {
    metricId: v.id("customMetrics"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Verify the metric exists and user can access it
    const metric = await ctx.db.get(args.metricId);
    if (!metric) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const canAccess = metric.userId === userId || 
                     (metric.organizationId && metric.organizationId === user.clerkOrganizationId) ||
                     metric.isPublic;
    
    if (!canAccess) {
      return null;
    }

    const usageRecords = await ctx.db
      .query("formulaUsage")
      .withIndex("by_metric", (q) => q.eq("metricId", args.metricId))
      .collect();

    const totalUsage = usageRecords.length;
    const successfulUsage = usageRecords.filter(r => r.success).length;
    const successRate = totalUsage > 0 ? (successfulUsage / totalUsage) * 100 : 0;
    
    const calculationTimes = usageRecords
      .filter(r => r.calculationTime !== undefined)
      .map(r => r.calculationTime!);
    
    const avgCalculationTime = calculationTimes.length > 0 
      ? calculationTimes.reduce((sum, time) => sum + time, 0) / calculationTimes.length
      : 0;

    return {
      totalUsage,
      successfulUsage,
      successRate,
      avgCalculationTime,
      lastUsed: totalUsage > 0 ? Math.max(...usageRecords.map(r => r.usedAt)) : null,
    };
  },
});

/**
 * Search metrics by name or description
 */
export const search = query({
  args: {
    query: v.string(),
    includePublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const searchTerm = args.query.toLowerCase();

    const allMetrics = await ctx.db
      .query("customMetrics")
      .filter((q) => 
        q.or(
          q.eq(q.field("userId"), userId),
          args.includePublic ? q.eq(q.field("isPublic"), true) : q.eq(q.field("isPublic"), false)
        )
      )
      .collect();

    // Simple text search on name and description
    const filteredMetrics = allMetrics.filter(metric => 
      metric.name.toLowerCase().includes(searchTerm) ||
      metric.description.toLowerCase().includes(searchTerm) ||
      metric.category.toLowerCase().includes(searchTerm)
    );

    return filteredMetrics.sort((a, b) => b.createdAt - a.createdAt);
  },
});