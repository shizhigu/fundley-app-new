import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    messageId: v.id("messages"),
    dataHash: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify user has access to the chat this message belongs to
    const chat = await ctx.db.get(message.chatId);
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

    return await ctx.db.insert("visualizationCache", {
      messageId: args.messageId,
      dataHash: args.dataHash,
      result: args.result,
      createdAt: Date.now(),
    });
  },
});

export const getByDataHash = query({
  args: { dataHash: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const cached = await ctx.db
      .query("visualizationCache")
      .withIndex("by_data_hash", (q) => q.eq("dataHash", args.dataHash))
      .first();

    if (!cached) {
      return null;
    }

    // Verify user has access to the message this cache belongs to
    const message = await ctx.db.get(cached.messageId);
    if (!message) {
      return null;
    }

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

    return cached;
  },
});

export const getByMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return [];
    }

    // Verify user has access to the chat this message belongs to
    const chat = await ctx.db.get(message.chatId);
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
      .query("visualizationCache")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("visualizationCache") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const cached = await ctx.db.get(args.id);
    if (!cached) {
      return null;
    }

    // Verify user has access to the message this cache belongs to
    const message = await ctx.db.get(cached.messageId);
    if (!message) {
      return null;
    }

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

    return cached;
  },
});

export const update = mutation({
  args: {
    id: v.id("visualizationCache"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const cached = await ctx.db.get(args.id);
    if (!cached) {
      throw new Error("Cache entry not found");
    }

    // Verify user has access to the message this cache belongs to
    const message = await ctx.db.get(cached.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const chat = await ctx.db.get(message.chatId);
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

    await ctx.db.patch(args.id, {
      result: args.result,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("visualizationCache") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const cached = await ctx.db.get(args.id);
    if (!cached) {
      throw new Error("Cache entry not found");
    }

    // Verify user has access to the message this cache belongs to
    const message = await ctx.db.get(cached.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const chat = await ctx.db.get(message.chatId);
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

    await ctx.db.delete(args.id);
  },
});

export const removeExpired = mutation({
  args: { olderThan: v.number() }, // timestamp
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Only allow cleanup for system/admin users
    // For now, allow any authenticated user to clean up old cache entries
    const expiredEntries = await ctx.db
      .query("visualizationCache")
      .filter((q) => q.lt(q.field("createdAt"), args.olderThan))
      .collect();

    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
    }

    return expiredEntries.length;
  },
});