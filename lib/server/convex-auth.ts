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
 * 预加载用户消息（带认证）
 * 这是 Convex + Next.js 的推荐模式
 */
export async function preloadUserMessages() {
  const token = await getAuthToken()
  
  if (!token) {
    return null // 未认证的用户
  }

  try {
    // 使用官方推荐的 preloadQuery 方法
    const preloadedMessages = await preloadQuery(
      api.messages.list,
      {}, // 参数
      { token } // 认证选项
    )
    
    return preloadedMessages
  } catch (error) {
    console.error('预加载消息失败:', error)
    return null
  }
}