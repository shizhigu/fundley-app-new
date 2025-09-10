import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User management
  users: defineTable({
    email: v.string(),
    clerkUserId: v.string(),
    clerkOrganizationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"]),

  // Organization management  
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    clerkOrganizationId: v.string(),
    settings: v.any(), // JSON settings object
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_org_id", ["clerkOrganizationId"])
    .index("by_slug", ["slug"]),

  // Chat sessions - each user can have multiple chats
  chats: defineTable({
    title: v.string(),
    userId: v.id("users"),
    visibility: v.union(v.literal("private"), v.literal("public")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_created_at", ["createdAt"]),

  // Messages (v2 format with parts and attachments) - belong to specific chats
  messages: defineTable({
    chatId: v.id("chats"), // Messages belong to specific chats
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    parts: v.any(), // JSONB array of message parts
    attachments: v.any(), // JSONB array of attachments
    extractedMetadata: v.optional(v.any()), // Cached metadata (tickers, suggestions, verification)
    createdAt: v.number(),
  })
    .index("by_chat_id", ["chatId"])
    .index("by_created_at", ["createdAt"]),

  // Document artifacts
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    kind: v.union(v.literal("text"), v.literal("code"), v.literal("sheet")),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_kind", ["kind"]),

  // Message voting (supports chat-based messages)
  votes: defineTable({
    messageId: v.id("messages"),
    chatId: v.id("chats"), // Required after migration
    userId: v.id("users"),
    isUpvoted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_message_id", ["messageId"])
    .index("by_chat_id", ["chatId"])
    .index("by_user_id", ["userId"]),

  // Stream tracking for real-time updates (simplified for permanent chat)
  streams: defineTable({
    userId: v.id("users"),
    streamId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_stream_id", ["streamId"]),

  // Visualization cache for charts and graphs
  visualizationCache: defineTable({
    messageId: v.id("messages"),
    visualizationType: v.string(),
    visualizationData: v.any(), // JSONB data
    visualizationSpec: v.optional(v.any()), // JSONB spec
    dataHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message_id", ["messageId"])
    .index("by_data_hash", ["dataHash"]),

  // Financial Metrics - Both built-in and custom (Python-based)
  metrics: defineTable({
    // Basic metric info
    name: v.string(),                    // Display name (e.g., "Alpha-1", "ROE")
    description: v.string(),             // What this metric measures
    category: v.string(),                // profitability, liquidity, efficiency, etc.
    
    // JSON AST definition (high-performance calculation engine)
    astDefinition: v.any(),              // JSON AST structure - REQUIRED
    
    formula: v.string(),                 // Human-readable formula description
    calculationType: v.optional(v.union(v.literal("single_period"), v.literal("ttm"), v.literal("multi_period"))), // Calculation method
    
    // Data requirements for AST metrics
    dataRequirements: v.object({
      income_statement: v.optional(v.array(v.string())),
      balance_sheet: v.optional(v.array(v.string())),
      cash_flow_statement: v.optional(v.array(v.string())),
      periods_needed: v.array(v.string())
    }),
    
    // Ownership & visibility
    userId: v.optional(v.id("users")),   // Creator (null for built-in metrics)
    organizationId: v.optional(v.string()), // Clerk org ID for sharing
    isBuiltIn: v.boolean(),              // true for system metrics, false for custom
    isPublic: v.boolean(),               // Whether other users can see/use it
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"])
    .index("by_built_in", ["isBuiltIn"])
    .index("by_name", ["name"]),

  // Metric usage tracking for analytics and optimization
  metricUsage: defineTable({
    metricId: v.id("metrics"),
    userId: v.id("users"),
    usedAt: v.number(),
    calculationTime: v.optional(v.number()), // Calculation performance tracking
    success: v.boolean(),
  })
    .index("by_metric", ["metricId"])
    .index("by_user", ["userId"]),

  // NEW LaTeX-based financial metrics (完全独立的新系统)
  latexMetrics: defineTable({
    // 基础信息
    name: v.string(),                    // 指标名称，如 "ROCE", "Custom ROE"
    description: v.string(),             // 指标描述
    category: v.string(),                // 分类：profitability, liquidity, efficiency等
    
    // 核心：LaTeX公式定义
    latexFormula: v.string(),            // LaTeX数学公式，如 "ROCE = \\frac{EBIT}{\\overline{Assets - Liab}}"
    
    // 变量到数据源的映射
    variableMapping: v.any(), // 灵活的对象结构，支持任意变量映射
    
    
    // 示例数据（用于验证和展示）
    exampleResult: v.optional(v.object({
      symbol: v.string(),
      value: v.number(),
      period: v.string()
    })),
    
    // 性能元数据
    avgExecutionTimeMs: v.optional(v.number()),
    lastExecutionSql: v.optional(v.string()),
    
    // 创建信息和权限
    createdBy: v.id("users"),
    clerkOrganizationId: v.optional(v.string()), // Clerk organization ID - 与用户表保持一致
    createdAt: v.number(),
    updatedAt: v.number(),
    
    // 使用统计
    usageCount: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_usage", ["usageCount"])
    .index("by_created_at", ["createdAt"])
    .index("by_organization", ["clerkOrganizationId"]),
});