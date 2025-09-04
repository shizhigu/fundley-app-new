import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 清理冗余reasoning parts的工具
export const cleanupReasoningParts = mutation({
  args: {
    dryRun: v.optional(v.boolean()), // 是否只是预览，不实际执行
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

    // 首先获取用户的所有聊天
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    // 然后获取这些聊天中的所有消息
    const messages = [];
    for (const chat of chats) {
      const chatMessages = await ctx.db
        .query("messages")
        .withIndex("by_chat_id", (q) => q.eq("chatId", chat._id))
        .collect();
      messages.push(...chatMessages);
    }

    console.log(`🔍 分析${messages.length}条消息中的reasoning parts...`);
    
    let totalReasoningParts = 0;
    let emptyReasoningParts = 0;
    let duplicateReasoningParts = 0;
    let totalSizeReduced = 0;
    const reasoningTextCounts = new Map<string, number>();
    const messagesToClean: { messageId: any; newParts: any[] }[] = [];
    
    // 第一步：分析所有消息，统计reasoning parts
    messages.forEach(message => {
      if (message.parts && Array.isArray(message.parts)) {
        message.parts.forEach(part => {
          if (part.type === 'reasoning') {
            totalReasoningParts++;
            
            if (!part.text || part.text.trim() === '') {
              emptyReasoningParts++;
            } else {
              const text = part.text;
              reasoningTextCounts.set(text, (reasoningTextCounts.get(text) || 0) + 1);
            }
          }
        });
      }
    });
    
    // 识别重复的reasoning text
    const duplicateReasoningTexts = new Set(
      Array.from(reasoningTextCounts.entries())
        .filter(([text, count]) => count > 1)
        .map(([text]) => text)
    );
    
    console.log('📊 初始分析结果:');
    console.log('- 总reasoning parts数量:', totalReasoningParts);
    console.log('- 空reasoning parts数量:', emptyReasoningParts);
    console.log('- 重复reasoning text类型数量:', duplicateReasoningTexts.size);
    
    // 第二步：为每条消息创建清理后的parts
    messages.forEach(message => {
      if (message.parts && Array.isArray(message.parts)) {
        const seenReasoningTexts = new Set<string>();
        const cleanedParts: any[] = [];
        let messageChanged = false;
        
        message.parts.forEach(part => {
          if (part.type === 'reasoning') {
            // 跳过空的reasoning parts
            if (!part.text || part.text.trim() === '') {
              messageChanged = true;
              totalSizeReduced += JSON.stringify(part).length;
              return;
            }
            
            // 跳过重复的reasoning parts (在同一条消息内)
            if (seenReasoningTexts.has(part.text)) {
              messageChanged = true;
              duplicateReasoningParts++;
              totalSizeReduced += JSON.stringify(part).length;
              return;
            }
            
            seenReasoningTexts.add(part.text);
          }
          
          cleanedParts.push(part);
        });
        
        if (messageChanged) {
          messagesToClean.push({
            messageId: message._id,
            newParts: cleanedParts
          });
        }
      }
    });
    
    const result = {
      analysis: {
        totalMessages: messages.length,
        totalReasoningParts,
        emptyReasoningParts,
        duplicateReasoningParts,
        messagesToClean: messagesToClean.length,
        estimatedSizeReduction: `${(totalSizeReduced / 1024).toFixed(2)}KB`,
      },
      cleaned: false
    };
    
    // 如果不是干运行，则执行实际清理
    if (!args.dryRun && messagesToClean.length > 0) {
      console.log(`🧹 开始清理${messagesToClean.length}条消息...`);
      
      for (const { messageId, newParts } of messagesToClean) {
        await ctx.db.patch(messageId, {
          parts: newParts
        });
      }
      
      result.cleaned = true;
      console.log('✅ 清理完成!');
    } else if (args.dryRun) {
      console.log('🔍 干运行模式 - 没有执行实际清理');
    } else {
      console.log('ℹ️  没有发现需要清理的消息');
    }
    
    return result;
  },
});

// 分析单个用户的消息统计信息
export const analyzeUserMessages = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return null;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // 首先获取用户的所有聊天
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    // 然后获取这些聊天中的所有消息
    const messages = [];
    for (const chat of chats) {
      const chatMessages = await ctx.db
        .query("messages")
        .withIndex("by_chat_id", (q) => q.eq("chatId", chat._id))
        .collect();
      messages.push(...chatMessages);
    }
    
    let totalParts = 0;
    let totalSize = 0;
    let reasoningParts = 0;
    let emptyReasoningParts = 0;
    const partsByType: Record<string, number> = {};
    
    messages.forEach(message => {
      if (message.parts && Array.isArray(message.parts)) {
        totalParts += message.parts.length;
        
        message.parts.forEach(part => {
          const partSize = JSON.stringify(part).length;
          totalSize += partSize;
          
          partsByType[part.type] = (partsByType[part.type] || 0) + 1;
          
          if (part.type === 'reasoning') {
            reasoningParts++;
            if (!part.text || part.text.trim() === '') {
              emptyReasoningParts++;
            }
          }
        });
      }
    });
    
    return {
      totalMessages: messages.length,
      totalParts,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      averagePartsPerMessage: totalParts > 0 ? (totalParts / messages.length).toFixed(2) : '0',
      averageSizePerMessage: messages.length > 0 ? `${(totalSize / messages.length / 1024).toFixed(2)}KB` : '0KB',
      reasoningParts,
      emptyReasoningParts,
      reasoningPercentage: totalParts > 0 ? ((reasoningParts / totalParts) * 100).toFixed(1) + '%' : '0%',
      partsByType,
    };
  },
});