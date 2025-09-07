import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called store without authentication present");
    }

    // Check if we've already stored this user before
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value
      if (user.email !== identity.email) {
        await ctx.db.patch(user._id, { 
          email: identity.email || "",
          updatedAt: Date.now(),
        });
      }
      return user._id;
    }

    // If it's a new identity, create a new user
    return await ctx.db.insert("users", {
      email: identity.email || "",
      clerkUserId: identity.subject,
      clerkOrganizationId: typeof identity.organizationId === 'string' ? identity.organizationId : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
  },
});

export const getByClerkUserId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
  },
});

// Webhook functions for Clerk integration
export const create = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    clerkOrganizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      clerkUserId: args.clerkUserId,
      clerkOrganizationId: args.clerkOrganizationId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateByClerkId = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    clerkOrganizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!user) {
      throw new Error(`User with clerkUserId ${args.clerkUserId} not found`);
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.email !== undefined) updates.email = args.email;
    if (args.clerkOrganizationId !== undefined) updates.clerkOrganizationId = args.clerkOrganizationId;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});