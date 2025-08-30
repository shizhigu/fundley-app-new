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

  // Chat conversations
  chats: defineTable({
    title: v.string(),
    userId: v.id("users"),
    visibility: v.union(v.literal("private"), v.literal("public")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_created_at", ["createdAt"]),

  // Messages (v2 format with parts and attachments)
  messages: defineTable({
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    parts: v.any(), // JSONB array of message parts
    attachments: v.any(), // JSONB array of attachments
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

  // Message voting
  votes: defineTable({
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    isUpvoted: v.boolean(),
  })
    .index("by_chat_id", ["chatId"])
    .index("by_message_id", ["messageId"]),

  // Stream tracking for real-time updates
  streams: defineTable({
    chatId: v.id("chats"),
    createdAt: v.number(),
  }).index("by_chat_id", ["chatId"]),

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
});