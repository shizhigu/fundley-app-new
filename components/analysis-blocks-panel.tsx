'use client'

import React, { useEffect, useState, useRef } from 'react'
import { AnalysisBlockRenderer } from './analysis-block-renderer'
import { getAnalysisBlocksSince } from '@/lib/actions/analysis-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3, Database } from 'lucide-react'
import { motion } from 'framer-motion'
import { useChatContext } from '@/lib/contexts/chat-context'

interface AnalysisBlocksPanelProps {
  chatId: string
  className?: string
}

export function AnalysisBlocksPanel({ chatId, className = '' }: AnalysisBlocksPanelProps) {
  const { isLoading: isChatStreaming } = useChatContext()
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)
  const lastTimestampRef = useRef<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 初始加载
  useEffect(() => {
    loadInitialBlocks()

    // 清理函数
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [chatId])

  // 只在聊天SSE流式传输时进行轮询
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // 只有在聊天流式传输时才启动轮询
    if (isChatStreaming) {
      pollIntervalRef.current = setInterval(() => {
        checkForNewBlocks()
      }, 5000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [chatId, isChatStreaming])

  const loadInitialBlocks = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedBlocks = await getAnalysisBlocksSince(chatId)

      setBlocks(fetchedBlocks)

      // 记录最新的时间戳
      if (fetchedBlocks.length > 0) {
        lastTimestampRef.current = fetchedBlocks[fetchedBlocks.length - 1].created_at
      }
    } catch (err) {
      console.error('Failed to load analysis blocks:', err)
      setError('Failed to load analysis blocks')
    } finally {
      setLoading(false)
    }
  }

  const checkForNewBlocks = async () => {
    if (!lastTimestampRef.current) {
      // 如果没有时间戳，做初始加载
      const fetchedBlocks = await getAnalysisBlocksSince(chatId)
      if (fetchedBlocks.length > 0) {
        setBlocks(fetchedBlocks)
        lastTimestampRef.current = fetchedBlocks[fetchedBlocks.length - 1].created_at
      }
      return
    }

    try {
      const newBlocks = await getAnalysisBlocksSince(chatId, lastTimestampRef.current)

      if (newBlocks.length > 0) {
        // 增量更新：添加新块而不是替换整个列表
        setBlocks(prevBlocks => {
          // 去重：避免重复添加
          const existingIds = new Set(prevBlocks.map(b => b.id))
          const uniqueNewBlocks = newBlocks.filter(b => !existingIds.has(b.id))

          if (uniqueNewBlocks.length > 0) {
            console.log(`📊 Found ${uniqueNewBlocks.length} new blocks`)
            // 更新最新时间戳
            lastTimestampRef.current = uniqueNewBlocks[uniqueNewBlocks.length - 1].created_at
            // 自动展开最新的 block，收起其他所有的
            const latestBlock = uniqueNewBlocks[uniqueNewBlocks.length - 1]
            setExpandedBlockId(latestBlock.id)
            return [...prevBlocks, ...uniqueNewBlocks]
          }

          return prevBlocks
        })
      }
    } catch (err) {
      console.error('Failed to check for new blocks:', err)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-4 p-4 ${className}`}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (blocks.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center space-y-2">
          <Database className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No analysis blocks yet</p>
          <p className="text-xs text-muted-foreground">
            AI agents will create blocks as they analyze data
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full ${className}`} style={{ width: '100%', overflow: 'auto' }}>
      <div className="space-y-4 p-4" style={{ maxWidth: '100%' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analysis Blocks
          </h3>
          <div className="flex items-center gap-3">
            <div className="neuro-raised-sm px-3 py-1.5 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900">
              <span className="text-sm font-medium text-foreground">
                {blocks.length} block{blocks.length !== 1 ? 's' : ''}
              </span>
            </div>
            {/* 实时指示器 - 仅在流式传输时显示 */}
            {isChatStreaming && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 neuro-raised-sm px-3 py-1.5 rounded-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
              </motion.div>
            )}
          </div>
        </div>

        {blocks.map((block) => (
          <div key={block.id}>
            <AnalysisBlockRenderer
              block={block}
              isExpanded={expandedBlockId === block.id}
              onToggle={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}