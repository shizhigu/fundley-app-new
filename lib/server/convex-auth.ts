import { auth } from '@clerk/nextjs/server'
import { preloadQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

/**
 * 获取认证 token 的辅助函数
 * 基于 Convex 官方文档最佳实践
 */
export async function getAuthToken() {
  const { getToken } = await auth()
  return (await getToken({ template: 'convex' })) ?? undefined
}

/**
 * 预加载用户消息（带认证）- 支持chat隔离
 * 这是 Convex + Next.js 的推荐模式
 */
export async function preloadUserMessages(chatId?: string) {
  const token = await getAuthToken()
  
  if (!token) {
    return null // 未认证的用户
  }

  try {
    // 如果没有提供chatId，先获取或创建默认chat
    let targetChatId = chatId
    if (!targetChatId) {
      // 这需要一个预加载的mutation调用，但我们在这里使用默认逻辑
      // 在页面组件中会处理这个逻辑
      return null
    }
    
    // 使用官方推荐的 preloadQuery 方法
    const preloadedMessages = await preloadQuery(
      api.messages.list,
      { chatId: targetChatId }, // 指定chatId参数
      { token } // 认证选项
    )
    
    return preloadedMessages
  } catch (error) {
    console.error('预加载消息失败:', error)
    return null
  }
}

/**
 * 获取或创建用户的默认chat ID
 */
export async function getOrCreateDefaultChatId() {
  const token = await getAuthToken()
  
  if (!token) {
    return null
  }

  try {
    // 使用preload方式获取默认chatId
    // 注意：这个方法需要mutation，通常在组件中处理
    const convex = new (await import('convex/browser')).ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    convex.setAuth(token)
    
    const chatId = await convex.mutation(api.chats.getOrCreateDefault)
    return chatId
  } catch (error) {
    console.error('获取默认chat失败:', error)
    return null
  }
}