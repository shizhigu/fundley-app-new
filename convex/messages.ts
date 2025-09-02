import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    parts: v.any(),
    attachments: v.optional(v.any()),
    extractedMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify chat exists and user has access
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user owns the chat
    if (chat.userId !== user._id) {
      throw new Error("Not authorized to add messages to this chat");
    }

    return await ctx.db.insert("messages", {
      chatId: args.chatId,
      role: args.role,
      parts: args.parts,
      attachments: args.attachments || [],
      extractedMetadata: args.extractedMetadata,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    // Verify chat exists and user has access
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Check if user owns the chat or if it's public
    if (chat.userId !== user._id && chat.visibility !== "public") {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    return messages;
  },
});

// 兼容原有 PersistentChat 的查询函数 - 返回默认chat的消息
export const listForPersistentChat = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // 找到用户的默认chat（通常是"Chat History"或最早的chat）
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("asc") // 最早创建的（通常是迁移的默认chat）
      .collect();

    if (chats.length === 0) {
      return [];
    }

    // 优先选择"Chat History"，否则选择第一个chat
    const defaultChat = chats.find(chat => chat.title === "Chat History") || chats[0];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", defaultChat._id))
      .order("asc")
      .collect();

    return messages;
  },
});

export const get = query({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const message = await ctx.db.get(args.id);
    if (!message) {
      return null;
    }

    // Get the chat to check permissions
    const chat = await ctx.db.get(message.chatId);
    if (!chat) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Check if user owns the chat or if it's public
    if (chat.userId !== user._id && chat.visibility !== "public") {
      return null;
    }

    return message;
  },
});

export const removeAfterTimestamp = mutation({
  args: {
    chatId: v.id("chats"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify chat exists and user has access
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user owns the chat
    if (chat.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Find and delete messages after timestamp for this chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .filter((q) => q.gte(q.field("createdAt"), args.timestamp))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return messages.length;
  },
});

// Add batch create for efficiency
export const createBatch = mutation({
  args: {
    chatId: v.id("chats"),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      parts: v.any(),
      attachments: v.optional(v.any()),
      extractedMetadata: v.optional(v.any()),
    }))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify chat exists and user has access
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user owns the chat
    if (chat.userId !== user._id) {
      throw new Error("Not authorized to add messages to this chat");
    }

    const results = [];
    for (const message of args.messages) {
      const result = await ctx.db.insert("messages", {
        chatId: args.chatId,
        role: message.role,
        parts: message.parts,
        attachments: message.attachments || [],
        extractedMetadata: message.extractedMetadata,
        createdAt: Date.now(),
      });
      results.push(result);
    }

    return results;
  },
});

export const updateParts = mutation({
  args: { 
    messageId: v.id("messages"),
    parts: v.any()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the message to verify ownership
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Get the chat to verify ownership
    const chat = await ctx.db.get(message.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Get user to verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || chat.userId !== user._id) {
      throw new Error("Not authorized to update this message");
    }

    await ctx.db.patch(args.messageId, {
      parts: args.parts
    });
    
    return { success: true };
  },
});

export const updateMetadata = mutation({
  args: { 
    messageId: v.id("messages"),
    extractedMetadata: v.any()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the message to verify ownership
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Get the chat to verify ownership
    const chat = await ctx.db.get(message.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Get user to verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || chat.userId !== user._id) {
      throw new Error("Not authorized to update this message");
    }

    await ctx.db.patch(args.messageId, {
      extractedMetadata: args.extractedMetadata
    });
    
    return { success: true };
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the message to verify ownership
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Get the chat to verify ownership
    const chat = await ctx.db.get(message.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Get user to verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || chat.userId !== user._id) {
      throw new Error("Not authorized to delete this message");
    }

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});