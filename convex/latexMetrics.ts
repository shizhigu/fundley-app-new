/**
 * LaTeX Metrics Convex Functions
 * 全新LaTeX指标系统的数据库操作
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * 创建新的LaTeX指标
 */
export const createLatexMetric = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    latexFormula: v.string(),
    variableMapping: v.object({}),
    exampleResult: v.optional(v.object({
      symbol: v.string(),
      value: v.number(),
      period: v.string()
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 查找用户
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    const metricId = await ctx.db.insert("latexMetrics", {
      name: args.name,
      description: args.description,
      category: args.category,
      latexFormula: args.latexFormula,
      variableMapping: args.variableMapping,
      exampleResult: args.exampleResult,
      createdBy: user._id,
      clerkOrganizationId: user.clerkOrganizationId, // 直接使用 clerkOrganizationId
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    });

    console.log(`✅ Created LaTeX metric: ${args.name} (ID: ${metricId})`);
    
    return {
      id: metricId,
      message: `LaTeX metric "${args.name}" created successfully`
    };
  },
});

/**
 * 获取LaTeX指标详情
 */
export const getLatexMetric = query({
  args: { id: v.id("latexMetrics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * 获取用户可访问的LaTeX指标列表（同organization内共享）
 */
export const getAccessibleLatexMetrics = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("❌ No identity found");
      return [];
    }

    // 获取当前用户信息
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      console.log("❌ No user found for clerk ID:", identity.subject);
      return [];
    }

    console.log("👤 User found:", {
      userId: user._id,
      email: user.email,
      clerkOrganizationId: user.clerkOrganizationId
    });

    // 直接使用 clerkOrganizationId 查询
    let metrics: Doc<"latexMetrics">[] = [];
    if (user.clerkOrganizationId) {
      console.log("🔍 Querying metrics for org:", user.clerkOrganizationId);
      metrics = await ctx.db
        .query("latexMetrics")
        .withIndex("by_organization", (q) => q.eq("clerkOrganizationId", user.clerkOrganizationId))
        .collect();
      console.log(`📊 Found ${metrics.length} metrics for org ${user.clerkOrganizationId}`);
      
      // 调试：显示所有metrics的组织信息
      if (metrics.length === 0) {
        const allMetrics = await ctx.db.query("latexMetrics").collect();
        console.log("🔍 All metrics in database:", allMetrics.map(m => ({
          id: m._id,
          name: m.name,
          clerkOrganizationId: m.clerkOrganizationId
        })));
      }
    } else {
      console.log("❌ User has no clerkOrganizationId");
    }

    // 按category过滤
    if (args.category) {
      metrics = metrics.filter(metric => metric.category === args.category);
    }

    // 按使用次数排序，限制数量
    return metrics
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, args.limit || 50);
  },
});

/**
 * 获取用户的LaTeX指标列表（仅自己创建的）
 */
export const getUserLatexMetrics = query({
  args: {
    userId: v.optional(v.id("users")),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // 获取当前用户信息
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || !user.clerkOrganizationId) {
      return [];
    }

    let metrics;
    
    if (args.userId) {
      // 验证请求的用户是否在同一组织内
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser || targetUser.clerkOrganizationId !== user.clerkOrganizationId) {
        return []; // 不允许查看其他组织用户的指标
      }
      
      metrics = await ctx.db
        .query("latexMetrics")
        .withIndex("by_creator", (q) => q.eq("createdBy", args.userId!))
        .order("desc")
        .take(args.limit || 50);
    } else {
      // 只返回用户组织内的指标
      metrics = await ctx.db
        .query("latexMetrics")
        .withIndex("by_organization", (q) => q.eq("clerkOrganizationId", user.clerkOrganizationId))
        .order("desc")
        .take(args.limit || 50);
    }
    
    if (args.category) {
      metrics = metrics.filter(metric => metric.category === args.category);
    }

    return metrics;
  },
});

/**
 * 获取热门LaTeX指标
 */
export const getPopularLatexMetrics = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // 获取当前用户信息
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || !user.clerkOrganizationId) {
      return [];
    }

    // 只返回用户组织内的热门指标
    const metrics = await ctx.db
      .query("latexMetrics")
      .withIndex("by_organization", (q) => q.eq("clerkOrganizationId", user.clerkOrganizationId))
      .collect();

    return metrics
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, args.limit || 20);
  },
});

/**
 * 搜索LaTeX指标
 */
export const searchLatexMetrics = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // 获取当前用户信息
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || !user.clerkOrganizationId) {
      return [];
    }

    // 只查询用户组织内的指标
    let allMetrics;
    
    if (args.category) {
      allMetrics = await ctx.db
        .query("latexMetrics")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
      // 按组织过滤
      allMetrics = allMetrics.filter(metric => 
        metric.clerkOrganizationId === user.clerkOrganizationId
      );
    } else {
      // 直接按组织查询
      allMetrics = await ctx.db
        .query("latexMetrics")
        .withIndex("by_organization", (q) => q.eq("clerkOrganizationId", user.clerkOrganizationId))
        .collect();
    }
    
    const searchTerm = args.searchTerm.toLowerCase();
    
    // 简单的文本搜索
    const filteredMetrics = allMetrics.filter(metric => 
      metric.name.toLowerCase().includes(searchTerm) ||
      metric.description.toLowerCase().includes(searchTerm) ||
      metric.latexFormula.toLowerCase().includes(searchTerm)
    );

    return filteredMetrics.slice(0, args.limit || 20);
  },
});

/**
 * 更新指标使用统计
 */
export const updateMetricUsage = mutation({
  args: {
    metricId: v.id("latexMetrics"),
    executionTimeMs: v.optional(v.number()),
    sql: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const metric = await ctx.db.get(args.metricId);
    if (!metric) {
      throw new Error("Metric not found");
    }

    const updates: any = {
      usageCount: metric.usageCount + 1,
      lastUsedAt: Date.now(),
    };

    // 更新平均执行时间
    if (args.executionTimeMs !== undefined) {
      const currentAvg = metric.avgExecutionTimeMs || 0;
      const currentCount = metric.usageCount;
      const newAvg = (currentAvg * currentCount + args.executionTimeMs) / (currentCount + 1);
      updates.avgExecutionTimeMs = Math.round(newAvg);
    }

    // 保存最后执行的SQL
    if (args.sql) {
      updates.lastExecutionSql = args.sql;
    }

    await ctx.db.patch(args.metricId, updates);
    
    return { success: true };
  },
});

/**
 * 删除LaTeX指标
 */
export const deleteLatexMetric = mutation({
  args: { id: v.id("latexMetrics") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const metric = await ctx.db.get(args.id);
    if (!metric) {
      throw new Error("Metric not found");
    }

    // 检查用户权限
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || metric.createdBy !== user._id) {
      throw new Error("Permission denied");
    }

    await ctx.db.delete(args.id);
    
    return { success: true, message: `Metric "${metric.name}" deleted successfully` };
  },
});

/**
 * 获取指标分类统计
 */
export const getLatexMetricCategories = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // 获取当前用户信息
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || !user.clerkOrganizationId) {
      return [];
    }

    // 只统计用户组织内的指标分类
    const metrics = await ctx.db
      .query("latexMetrics")
      .withIndex("by_organization", (q) => q.eq("clerkOrganizationId", user.clerkOrganizationId))
      .collect();
    
    const categories = metrics.reduce((acc: Record<string, number>, metric) => {
      acc[metric.category] = (acc[metric.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categories).map(([name, count]) => ({ name, count }));
  },
});