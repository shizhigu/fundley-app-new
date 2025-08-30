import { mutation, query } from "convex/server";
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

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete all votes for this chat
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.id))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete the chat
    await ctx.db.delete(args.id);
  },
});