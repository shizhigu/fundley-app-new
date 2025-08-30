import { mutation, query } from "convex/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    parts: v.any(),
    attachments: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to this chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || (chat.userId !== user._id && chat.visibility !== "public")) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("messages", {
      chatId: args.chatId,
      role: args.role,
      parts: args.parts,
      attachments: args.attachments || [],
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

    // Verify user has access to this chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || (chat.userId !== user._id && chat.visibility !== "public")) {
      return [];
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
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

    // Verify user has access to the chat this message belongs to
    const chat = await ctx.db.get(message.chatId);
    if (!chat) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || (chat.userId !== user._id && chat.visibility !== "public")) {
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

    // Verify user owns this chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || chat.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Find and delete messages after timestamp
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