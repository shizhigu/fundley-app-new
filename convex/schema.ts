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

  // Custom Formula Builder - Financial Metrics
  customMetrics: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    formula: v.any(), // FormulaAST JSON structure
    prompt: v.string(), // Generated LLM prompt/instruction
    userId: v.id("users"), // Creator of the metric
    organizationId: v.optional(v.string()), // Clerk organization ID for sharing
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"]),

  // Formula usage tracking for analytics and optimization
  formulaUsage: defineTable({
    metricId: v.id("customMetrics"),
    userId: v.id("users"),
    usedAt: v.number(),
    calculationTime: v.optional(v.number()), // Calculation performance tracking
    success: v.boolean(),
  })
    .index("by_metric", ["metricId"])
    .index("by_user", ["userId"]),
});