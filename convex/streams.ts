import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    chatId: v.id("chats"),
    data: v.any(),
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

    return await ctx.db.insert("streams", {
      chatId: args.chatId,
      data: args.data,
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
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
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

    // Verify user has access to the chat this stream belongs to
    const chat = await ctx.db.get(stream.chatId);
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

    // Delete all streams for this chat
    const streams = await ctx.db
      .query("streams")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
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

    // Verify user owns the chat this stream belongs to
    const chat = await ctx.db.get(stream.chatId);
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

    await ctx.db.delete(args.id);
  },
});