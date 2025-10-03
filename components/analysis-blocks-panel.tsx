'use client'

import React, { useEffect, useState, useRef } from 'react'
import { AnalysisBlockRenderer } from './analysis-block-renderer'
import { getAnalysisBlocksSince } from '@/lib/actions/analysis-blocks'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3, Database, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <ScrollArea className={`h-full ${className}`}>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysis Blocks
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
            {/* 实时指示器 - 仅在流式传输时显示 */}
            {isChatStreaming && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-1"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Live</span>
              </motion.div>
            )}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {blocks.map((block, index) => (
            <motion.div
              key={block.id}
              initial={index >= blocks.length - 1 ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              layout
              layoutId={block.id}
            >
              {/* 新块的闪光效果 */}
              {index === blocks.length - 1 && blocks.length > 1 && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg pointer-events-none"
                />
              )}

              <AnalysisBlockRenderer block={block} />

              {/* 新块标记 */}
              {index === blocks.length - 1 && blocks.length > 1 && (
                <motion.div
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 2, delay: 1 }}
                  className="absolute -top-2 -right-2 flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded-full text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  New
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}