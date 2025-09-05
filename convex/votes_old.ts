import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    messageId: v.id("messages"),
    chatId: v.id("chats"),
    isUpvote: v.boolean(),
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

    // Verify message belongs to this chat
    const message = await ctx.db.get(args.messageId);
    if (!message || message.chatId !== args.chatId) {
      throw new Error("Message not found or doesn't belong to this chat");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || (chat.userId !== user._id && chat.visibility !== "public")) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("votes", {
      messageId: args.messageId,
      chatId: args.chatId,
      userId: user._id,
      isUpvoted: args.isUpvote,
      createdAt: Date.now(),
    });
  },
});

export const listByMessage = query({
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
      .query("votes")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();
  },
});

export const listByChat = query({
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
      .query("votes")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("votes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const vote = await ctx.db.get(args.id);
    if (!vote) {
      return null;
    }

    // Verify user has access to the chat this vote belongs to
    const chat = await ctx.db.get(vote.chatId);
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

    return vote;
  },
});

export const update = mutation({
  args: {
    id: v.id("votes"),
    isUpvote: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const vote = await ctx.db.get(args.id);
    if (!vote) {
      throw new Error("Vote not found");
    }

    // Verify user has access to the chat this vote belongs to
    const chat = await ctx.db.get(vote.chatId);
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
      isUpvoted: args.isUpvote,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("votes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const vote = await ctx.db.get(args.id);
    if (!vote) {
      throw new Error("Vote not found");
    }

    // Verify user has access to the chat this vote belongs to
    const chat = await ctx.db.get(vote.chatId);
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