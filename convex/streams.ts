import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("streams", {
      userId: user._id,
      streamId: args.streamId,
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
      .query("streams")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("asc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("streams") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const stream = await ctx.db.get(args.id);
    if (!stream) {
      return null;
    }

    // Verify user owns this stream
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || stream.userId !== user._id) {
      return null;
    }

    return stream;
  },
});

export const removeForChat = mutation({
  args: { chatId: v.id("chats") },
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

    // Delete all streams for this user (streams are no longer chat-specific)
    const streams = await ctx.db
      .query("streams")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    for (const stream of streams) {
      await ctx.db.delete(stream._id);
    }

    return streams.length;
  },
});

export const remove = mutation({
  args: { id: v.id("streams") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const stream = await ctx.db.get(args.id);
    if (!stream) {
      throw new Error("Stream not found");
    }

    // Verify user owns this stream
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || stream.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});