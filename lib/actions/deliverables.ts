'use server'

import { neon } from '@neondatabase/serverless'

export type Deliverable = {
  id: string
  chat_id?: string // Added for file access
  content: any // Completely flexible, agent-defined
  created_at: string
}

export async function getDeliverables(chatId: string): Promise<Deliverable[]> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not configured')
    return []
  }

  const db = neon(process.env.DATABASE_URL)

  try {
    const deliverables = await db`
      SELECT id, content, created_at
      FROM deliverables
      WHERE chat_id = ${chatId}::uuid
      ORDER BY created_at ASC
      LIMIT 50
    `

    return deliverables.map(deliverable => ({
      id: deliverable.id,
      chat_id: chatId, // Pass through the chat_id
      content: deliverable.content,
      created_at: deliverable.created_at.toISOString()
    }))
  } catch (error) {
    console.error('Failed to fetch deliverables:', error)
    return []
  }
}

// 增量获取：只获取指定时间之后的新块
export async function getDeliverablesSince(
  chatId: string,
  sinceTimestamp?: string
): Promise<Deliverable[]> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not configured')
    return []
  }

  const db = neon(process.env.DATABASE_URL)

  try {
    let query
    if (sinceTimestamp) {
      // 只获取新增的块
      query = db`
        SELECT id, content, created_at
        FROM deliverables
        WHERE chat_id = ${chatId}::uuid
          AND created_at > ${sinceTimestamp}::timestamp
        ORDER BY created_at ASC
        LIMIT 50
      `
    } else {
      // 首次加载，获取所有
      query = db`
        SELECT id, content, created_at
        FROM deliverables
        WHERE chat_id = ${chatId}::uuid
        ORDER BY created_at ASC
        LIMIT 50
      `
    }

    const deliverables = await query

    return deliverables.map(deliverable => ({
      id: deliverable.id,
      chat_id: chatId, // Pass through the chat_id
      content: deliverable.content,
      created_at: deliverable.created_at.toISOString()
    }))
  } catch (error) {
    console.error('Failed to fetch deliverables:', error)
    return []
  }
}

export async function getDeliverable(deliverableId: string): Promise<Deliverable | null> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not configured')
    return null
  }

  const db = neon(process.env.DATABASE_URL)

  try {
    const deliverables = await db`
      SELECT id, content, created_at
      FROM deliverables
      WHERE id = ${deliverableId}::uuid
      LIMIT 1
    `

    if (deliverables.length === 0) return null

    return {
      id: deliverables[0].id,
      content: deliverables[0].content,
      created_at: deliverables[0].created_at.toISOString()
    }
  } catch (error) {
    console.error('Failed to fetch deliverable:', error)
    return null
  }
}

// Optional: Get deliverables with specific content patterns
export async function searchDeliverables(
  chatId: string,
  searchPattern: Record<string, any>
): Promise<Deliverable[]> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not configured')
    return []
  }

  const db = neon(process.env.DATABASE_URL)

  try {
    // Use JSONB containment operator @>
    const deliverables = await db`
      SELECT id, content, created_at
      FROM deliverables
      WHERE chat_id = ${chatId}::uuid
        AND content @> ${JSON.stringify(searchPattern)}::jsonb
      ORDER BY created_at ASC
      LIMIT 50
    `

    return deliverables.map(deliverable => ({
      id: deliverable.id,
      chat_id: chatId, // Pass through the chat_id
      content: deliverable.content,
      created_at: deliverable.created_at.toISOString()
    }))
  } catch (error) {
    console.error('Failed to search deliverables:', error)
    return []
  }
}