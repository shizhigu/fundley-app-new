import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { 
    title: v.string(),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
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

    return await ctx.db.insert("chats", {
      title: args.title,
      userId: user._id,
      visibility: args.visibility || "private",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const list = query({
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

    return await ctx.db
      .query("chats")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const chat = await ctx.db.get(args.id);
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

    // Check if user owns this chat or if it's public
    if (chat.userId !== user._id && chat.visibility !== "public") {
      return null;
    }

    return chat;
  },
});

export const update = mutation({
  args: {
    id: v.id("chats"),
    title: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.id);
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

    const updates: any = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.visibility !== undefined) updates.visibility = args.visibility;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.id);
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

    // Delete all messages in this chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.id))
      .collect();

    // Delete visualization caches for all messages in this chat
    for (const message of messages) {
      // Find and delete visualization caches for this message
      const visualizationCaches = await ctx.db
        .query("visualizationCache")
        .withIndex("by_message_id", (q) => q.eq("messageId", message._id))
        .collect();
      
      for (const cache of visualizationCaches) {
        await ctx.db.delete(cache._id);
      }
      
      // Delete the message itself
      await ctx.db.delete(message._id);
    }

    // Votes table removed - no cleanup needed

    // Delete the chat
    await ctx.db.delete(args.id);
  },
});

// Get or create default chat for user (for migration compatibility)
export const getOrCreateDefault = mutation({
  args: {},
  handler: async (ctx) => {
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

    // Check if user has any chats
    const existingChats = await ctx.db
      .query("chats")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    if (existingChats.length > 0) {
      // Return the most recent chat
      return existingChats.sort((a, b) => b.createdAt - a.createdAt)[0]._id;
    }

    // Create default chat
    const chatId = await ctx.db.insert("chats", {
      title: "Chat History",
      userId: user._id,
      visibility: "private",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return chatId;
  },
});