'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { AnalysisBlockRenderer } from './analysis-block-renderer'
import { getAnalysisBlocksSince } from '@/lib/actions/analysis-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3, Database, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useChatContext } from '@/lib/contexts/chat-context'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'

interface AnalysisBlocksPanelProps {
  chatId: string
  className?: string
}

export function AnalysisBlocksPanel({ chatId, className = '' }: AnalysisBlocksPanelProps) {
  const t = useTranslations('analysis')
  const { isLoading: isChatStreaming } = useChatContext()
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const lastTimestampRef = useRef<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 过滤blocks - 根据搜索关键词
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return blocks

    const query = searchQuery.toLowerCase()
    return blocks.filter((block) => {
      // 搜索content JSONB中的所有字段
      const content = block.content || block

      // 搜索标题
      if (content.title?.toLowerCase().includes(query)) return true

      // 搜索描述
      if (content.description?.toLowerCase().includes(query)) return true

      // 搜索text内容
      if (content.text?.toLowerCase().includes(query)) return true

      // 递归搜索JSONB中的所有字符串值
      const searchInObject = (obj: any): boolean => {
        if (typeof obj === 'string') {
          return obj.toLowerCase().includes(query)
        }
        if (Array.isArray(obj)) {
          return obj.some(item => searchInObject(item))
        }
        if (obj && typeof obj === 'object') {
          return Object.values(obj).some(value => searchInObject(value))
        }
        return false
      }

      // 深度搜索整个content对象
      return searchInObject(content)
    })
  }, [blocks, searchQuery])

  // 初始加载 - 每次切换chat时重新加载
  useEffect(() => {
    // 重置状态
    setBlocks([])
    setExpandedBlockId(null)
    setSearchQuery('') // 清空搜索
    lastTimestampRef.current = null

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

      // 记录最新的时间戳，并自动展开最新的block
      if (fetchedBlocks.length > 0) {
        const latestBlock = fetchedBlocks[fetchedBlocks.length - 1]
        lastTimestampRef.current = latestBlock.created_at
        setExpandedBlockId(latestBlock.id)
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
        const latestBlock = fetchedBlocks[fetchedBlocks.length - 1]
        lastTimestampRef.current = latestBlock.created_at
        setExpandedBlockId(latestBlock.id)
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
          <p className="text-sm text-muted-foreground">{t('noBlocksYet')}</p>
          <p className="text-xs text-muted-foreground">
            {t('agentsWillCreate')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full ${className}`} style={{ width: '100%', overflow: 'auto' }}>
      <div className="space-y-4 p-4" style={{ maxWidth: '100%' }}>
        <div className="space-y-4 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t('analysisBlocks')}
            </h3>
            <div className="flex items-center gap-3">
              <div className="neuro-raised-sm px-3 py-1.5 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900">
                <span className="text-sm font-medium text-foreground">
                  {filteredBlocks.length} {filteredBlocks.length !== 1 ? t('blocks') : t('block')}
                  {searchQuery && blocks.length !== filteredBlocks.length && (
                    <span className="text-muted-foreground"> / {blocks.length}</span>
                  )}
                </span>
              </div>
              {/* 实时指示器 - 仅在流式传输时显示 */}
              {isChatStreaming && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 neuro-raised-sm px-3 py-1.5 rounded-full bg-brand-badge"
                >
                  <div className="h-2 w-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">{t('live')}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {blocks.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchBlocks')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* No results */}
        {filteredBlocks.length === 0 && searchQuery && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t('noMatchingBlocks')}</p>
            </div>
          </div>
        )}

        {/* Blocks List */}
        {filteredBlocks.map((block) => (
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