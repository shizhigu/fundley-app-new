import { mutation } from "./_generated/server";

export const migrateMessagesToChats = mutation({
  args: {},
  handler: async (ctx) => {
    // This migration creates default chats for users and assigns messages to them
    const users = await ctx.db.query("users").collect();
    
    console.log(`Starting migration for ${users.length} users...`);
    
    let migratedMessages = 0;
    let createdChats = 0;
    
    for (const user of users) {
      try {
        // Get all messages for this user that don't have a chatId
        const userMessages = await ctx.db
          .query("messages")
          .filter((q) => q.eq(q.field("userId"), user._id))
          .filter((q) => q.eq(q.field("chatId"), undefined))
          .collect();
        
        if (userMessages.length === 0) {
          console.log(`No messages to migrate for user ${user.clerkUserId}`);
          continue;
        }
        
        // Create a default chat for this user
        const chatId = await ctx.db.insert("chats", {
          title: "Chat History",
          userId: user._id,
          visibility: "private",
          createdAt: userMessages[0]?.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
        
        createdChats++;
        console.log(`Created default chat ${chatId} for user ${user.clerkUserId}`);
        
        // Assign all user messages to this chat
        for (const message of userMessages) {
          await ctx.db.patch(message._id, {
            chatId: chatId,
          });
          migratedMessages++;
        }
        
        console.log(`Migrated ${userMessages.length} messages for user ${user.clerkUserId}`);
      } catch (error) {
        console.error(`Error migrating user ${user.clerkUserId}:`, error);
      }
    }
    
    console.log(`Migration completed: ${createdChats} chats created, ${migratedMessages} messages migrated`);
    
    return {
      success: true,
      createdChats,
      migratedMessages,
      totalUsers: users.length
    };
  },
});

export const cleanupLegacyFields = mutation({
  args: {},
  handler: async (ctx) => {
    // This removes the legacy userId field from messages after migration
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.neq(q.field("userId"), undefined))
      .collect();
      
    console.log(`Cleaning up legacy fields from ${messages.length} messages...`);
    
    for (const message of messages) {
      // Remove the legacy userId field
      await ctx.db.patch(message._id, {
        userId: undefined,
      });
    }
    
    return {
      success: true,
      cleanedMessages: messages.length
    };
  },
});

export const validateMigration = mutation({
  args: {},
  handler: async (ctx) => {
    // Check migration status
    const totalMessages = await ctx.db.query("messages").collect();
    const messagesWithoutChat = totalMessages.filter(m => !m.chatId);
    const messagesWithLegacyUserId = totalMessages.filter(m => m.userId);
    
    const totalChats = await ctx.db.query("chats").collect();
    
    return {
      totalMessages: totalMessages.length,
      messagesWithoutChat: messagesWithoutChat.length,
      messagesWithLegacyUserId: messagesWithLegacyUserId.length,
      totalChats: totalChats.length,
      migrationComplete: messagesWithoutChat.length === 0 && messagesWithLegacyUserId.length === 0
    };
  },
});