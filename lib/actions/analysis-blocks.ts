'use server'

import { neon } from '@neondatabase/serverless'

export type AnalysisBlock = {
  id: string
  chat_id?: string // Added for file access
  content: any // Completely flexible, agent-defined
  created_at: string
}

export async function getAnalysisBlocks(chatId: string): Promise<AnalysisBlock[]> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not configured')
    return []
  }

  const db = neon(process.env.DATABASE_URL)

  try {
    const blocks = await db`
      SELECT id, content, created_at
      FROM analysis_blocks
      WHERE chat_id = ${chatId}::uuid
      ORDER BY created_at ASC
      LIMIT 50
    `

    return blocks.map(block => ({
      id: block.id,
      chat_id: chatId, // Pass through the chat_id
      content: block.content,
      created_at: block.created_at.toISOString()
    }))
  } catch (error) {
    console.error('Failed to fetch analysis blocks:', error)
    return []
  }
}

// 增量获取：只获取指定时间之后的新块
export async function getAnalysisBlocksSince(
  chatId: string,
  sinceTimestamp?: string
): Promise<AnalysisBlock[]> {
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
        FROM analysis_blocks
        WHERE chat_id = ${chatId}::uuid
          AND created_at > ${sinceTimestamp}::timestamp
        ORDER BY created_at ASC
        LIMIT 50
      `
    } else {
      // 首次加载，获取所有
      query = db`
        SELECT id, content, created_at
        FROM analysis_blocks
        WHERE chat_id = ${chatId}::uuid
        ORDER BY created_at ASC
        LIMIT 50
      `
    }

    const blocks = await query

    return blocks.map(block => ({
      id: block.id,
      chat_id: chatId, // Pass through the chat_id
      content: block.content,
      created_at: block.created_at.toISOString()
    }))
  } catch (error) {
    console.error('Failed to fetch analysis blocks:', error)
    return []
  }
}

export async function getAnalysisBlock(blockId: string): Promise<AnalysisBlock | null> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not configured')
    return null
  }

  const db = neon(process.env.DATABASE_URL)

  try {
    const blocks = await db`
      SELECT id, content, created_at
      FROM analysis_blocks
      WHERE id = ${blockId}::uuid
      LIMIT 1
    `

    if (blocks.length === 0) return null

    return {
      id: blocks[0].id,
      content: blocks[0].content,
      created_at: blocks[0].created_at.toISOString()
    }
  } catch (error) {
    console.error('Failed to fetch analysis block:', error)
    return null
  }
}

// Optional: Get blocks with specific content patterns
export async function searchAnalysisBlocks(
  chatId: string,
  searchPattern: Record<string, any>
): Promise<AnalysisBlock[]> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not configured')
    return []
  }

  const db = neon(process.env.DATABASE_URL)

  try {
    // Use JSONB containment operator @>
    const blocks = await db`
      SELECT id, content, created_at
      FROM analysis_blocks
      WHERE chat_id = ${chatId}::uuid
        AND content @> ${JSON.stringify(searchPattern)}::jsonb
      ORDER BY created_at ASC
      LIMIT 50
    `

    return blocks.map(block => ({
      id: block.id,
      chat_id: chatId, // Pass through the chat_id
      content: block.content,
      created_at: block.created_at.toISOString()
    }))
  } catch (error) {
    console.error('Failed to search analysis blocks:', error)
    return []
  }
}