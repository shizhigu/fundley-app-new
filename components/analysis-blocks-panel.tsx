'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { AnalysisBlockRenderer } from './analysis-block-renderer'
import { getAnalysisBlocksSince } from '@/lib/actions/analysis-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3, Database, Search, X, MessageSquare, Library, ChevronDown, RefreshCw, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useChatContext } from '@/lib/contexts/chat-context'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { useBlockViewStore } from '@/stores/block-view-store'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AnalysisBlocksPanelProps {
  chatId: string
  className?: string
}

export function AnalysisBlocksPanel({ chatId, className = '' }: AnalysisBlocksPanelProps) {
  const t = useTranslations('analysis')
  const { isLoading: isChatStreaming, blockToolCalled } = useChatContext()
  const { activeBlockId, setActiveBlock } = useBlockViewStore()

  // Quick filter for "This Chat" blocks
  const [showCurrentChatOnly, setShowCurrentChatOnly] = useState(false)

  // Restore last opened block from localStorage
  const restoredBlockId = typeof window !== 'undefined' ? localStorage.getItem('activeBlockId') : null;

  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)
  const [detailViewBlockId, setDetailViewBlockId] = useState<string | null>(() => {
    // Restore last opened block from localStorage on mount
    return restoredBlockId;
  })
  const [searchQuery, setSearchQuery] = useState('')
  const lastTimestampRef = useRef<string | null>(null)

  // 过滤blocks - 根据搜索关键词和 "This Chat" 过滤器
  const filteredBlocks = useMemo(() => {
    let filtered = blocks

    // Filter by current chat if enabled
    // Show blocks that were created OR modified in this chat
    if (showCurrentChatOnly) {
      filtered = filtered.filter(block =>
        block.sourceChatId === chatId ||
        block.chat_id === chatId ||
        block.modifiedInChats?.includes(chatId) // Check modification history
      )
    }

    // Filter by search query
    if (!searchQuery.trim()) return filtered

    const query = searchQuery.toLowerCase()
    return filtered.filter((block) => {
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
  }, [blocks, searchQuery, showCurrentChatOnly, chatId])

  // 初始加载 - 只在组件挂载时加载一次(Library view)
  useEffect(() => {
    loadInitialBlocks()
  }, []) // Empty deps - load once on mount

  // 被动触发式轮询：只在 block 工具调用后轮询
  useEffect(() => {
    if (blockToolCalled === 0) return // 没有工具调用，不启动轮询

    console.log('🎯 Block tool called detected, starting limited polling...')

    let pollCount = 0
    const MAX_POLLS = 3
    const POLL_INTERVAL = 5000

    const startPolling = async () => {
      for (let i = 0; i < MAX_POLLS; i++) {
        pollCount++
        console.log(`📊 Polling attempt ${pollCount}/${MAX_POLLS}`)

        // 执行轮询
        const foundNew = await checkForNewBlocks()

        // 如果找到新数据，立即停止
        if (foundNew) {
          console.log('✅ New blocks found, stopping polling')
          break
        }

        // 如果不是最后一次，等待5秒
        if (i < MAX_POLLS - 1) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
        }
      }

      console.log(`⏹️ Polling completed (${pollCount} attempts)`)
    }

    startPolling()
  }, [blockToolCalled]) // 监听 blockToolCalled 变化

  const loadInitialBlocks = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('📦 Loading all user blocks (Library view)')

      // Load all user's blocks from API
      const response = await fetch(`/api/blocks`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API error:', response.status, errorText)
        throw new Error('Failed to fetch blocks')
      }
      const data = await response.json()
      console.log('📦 Library API response:', data)
      const fetchedBlocks = data.blocks || []

      console.log('📦 Fetched blocks count:', fetchedBlocks.length)
      setBlocks(fetchedBlocks)

      // Record latest timestamp for polling
      if (fetchedBlocks.length > 0) {
        const latestBlock = fetchedBlocks[fetchedBlocks.length - 1]
        lastTimestampRef.current = latestBlock.created_at
      }
    } catch (err) {
      console.error('❌ Failed to load analysis blocks:', err)
      setError('Failed to load analysis blocks')
    } finally {
      setLoading(false)
    }
  }

  const checkForNewBlocks = async (): Promise<boolean> => {
    try {
      // Fetch all user blocks (Library view) - same as loadInitialBlocks
      const response = await fetch(`/api/blocks`)
      if (!response.ok) {
        console.error('❌ Polling API error:', response.status)
        return false
      }
      const data = await response.json()
      const fetchedBlocks = data.blocks || []

      let foundNewOrUpdated = false
      const currentActiveBlockId = activeBlockId || (typeof window !== 'undefined' ? localStorage.getItem('activeBlockId') : null)

      setBlocks(prevBlocks => {
        // Find new blocks (not in previous list)
        const existingIds = new Set(prevBlocks.map(b => b.id))
        const uniqueNewBlocks = fetchedBlocks.filter((b: any) => !existingIds.has(b.id))

        if (uniqueNewBlocks.length > 0) {
          console.log(`📊 Polling: Found ${uniqueNewBlocks.length} new blocks`)
          foundNewOrUpdated = true
          // Auto-open latest new block in detail view
          const latestBlock = uniqueNewBlocks[uniqueNewBlocks.length - 1]
          setDetailViewBlockId(latestBlock.id)

          // Immediately update localStorage (don't wait for useEffect)
          localStorage.setItem('activeBlockId', latestBlock.id)
          localStorage.setItem('activeBlockContent', JSON.stringify(latestBlock))
          setActiveBlock(latestBlock.id, latestBlock)
          console.log(`🔓 Auto-opened new block and set as active: ${latestBlock.id}`)
        }

        // Check for updated blocks (content/title changed)
        const updatedList = fetchedBlocks.map((newBlock: any) => {
          const existing = prevBlocks.find(b => b.id === newBlock.id)
          if (existing) {
            // If content changed, use new version
            if (JSON.stringify(existing.content) !== JSON.stringify(newBlock.content)) {
              console.log(`🔄 Block ${newBlock.id} updated`)
              foundNewOrUpdated = true

              // If this is the currently active block, update localStorage immediately
              if (newBlock.id === currentActiveBlockId) {
                console.log(`📝 Updating active block content in localStorage: ${newBlock.id}`)
                localStorage.setItem('activeBlockContent', JSON.stringify(newBlock))
                setActiveBlock(newBlock.id, newBlock)
              }
            }
            return newBlock // Always use latest from server
          }
          return newBlock
        })

        return updatedList
      })

      // Update timestamp
      if (fetchedBlocks.length > 0) {
        const latest = fetchedBlocks.reduce((max: any, b: any) =>
          new Date(b.createdAt) > new Date(max.createdAt) ? b : max
        )
        lastTimestampRef.current = latest.createdAt
      }

      return foundNewOrUpdated
    } catch (err) {
      console.error('Failed to poll for blocks:', err)
      return false
    }
  }

  // Get the block for detail view
  const detailBlock = detailViewBlockId ? blocks.find(b => b.id === detailViewBlockId) : null

  // Auto-set active block with full content when opening detail view
  useEffect(() => {
    if (detailViewBlockId && detailBlock) {
      // Store in localStorage for reliable access across components
      localStorage.setItem('activeBlockId', detailViewBlockId);
      localStorage.setItem('activeBlockContent', JSON.stringify(detailBlock));
      console.log('✅ Stored active block in localStorage:', detailViewBlockId);

      // Also update Zustand store for UI state
      setActiveBlock(detailViewBlockId, detailBlock);
    } else if (!detailViewBlockId) {
      // Only clear localStorage when explicitly closing (detailViewBlockId is null)
      // Don't clear when blocks haven't loaded yet (detailViewBlockId exists but detailBlock is null)
      localStorage.removeItem('activeBlockId');
      localStorage.removeItem('activeBlockContent');
      console.log('❌ Cleared active block from localStorage');

      // Also clear Zustand store
      setActiveBlock(null, null);
    }
  }, [detailViewBlockId, detailBlock, setActiveBlock]);

  // Detail view - full screen single block
  if (detailViewBlockId && detailBlock) {
    return (
      <div className={`h-full ${className} flex flex-col`} style={{ width: '100%' }}>
        {/* Detail view header with back button */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <button
            onClick={() => {
              console.log('🔙 Back to list clicked - clearing detail view and localStorage');
              setDetailViewBlockId(null);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
            <span className="text-sm font-medium">Back to list</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <h3 className="text-sm font-medium text-muted-foreground truncate flex-1">
            {detailBlock.content?.title || detailBlock.title || 'Analysis Block'}
          </h3>
          {/* Working indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Working
          </div>
        </div>

        {/* Detail view content - scrollable */}
        <div className="flex-1 overflow-auto p-4">
          <AnalysisBlockRenderer
            block={detailBlock}
            isExpanded={true}
            isActive={false} // No need to show active state in detail view
            onToggle={() => {}} // No-op in detail view
            onSelect={() => {}} // No-op, auto-managed now
            onUpdate={(updatedBlock) => {
              // Update blocks state with the updated block
              setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b))
              console.log('✅ Block updated without page reload:', updatedBlock.id)
            }}
          />
        </div>
      </div>
    )
  }

  // List view - grid of cards
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
              {/* Create new block button */}
              <button
                onClick={async () => {
                  try {
                    const placeholder = t('startTyping') || 'Start typing...'

                    // Create new block via API
                    const response = await fetch('/api/blocks', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sourceChatId: chatId,
                        content: {
                          title: t('newBlock') || 'New Analysis Block',
                          sections: [{
                            id: 'sec-1',
                            content: placeholder,
                            order: 0
                          }]
                        }
                      })
                    })

                    if (!response.ok) {
                      console.error('Failed to create block')
                      return
                    }

                    const { block } = await response.json()

                    // Add to list and open detail view
                    setBlocks(prev => [block, ...prev])
                    setDetailViewBlockId(block.id)

                    // Immediately update localStorage (don't wait for useEffect)
                    localStorage.setItem('activeBlockId', block.id)
                    localStorage.setItem('activeBlockContent', JSON.stringify(block))
                    setActiveBlock(block.id, block)
                    console.log('✅ Created new block and set as active:', block.id)
                  } catch (error) {
                    console.error('Error creating block:', error)
                  }
                }}
                className="neuro-raised-sm p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                title={t('createBlock') || 'Create new block'}
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Refresh button */}
              <button
                onClick={() => loadInitialBlocks()}
                disabled={loading}
                className="neuro-raised-sm p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh blocks"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

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

          {/* Quick Filter: This Chat */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCurrentChatOnly(!showCurrentChatOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all border ${
                showCurrentChatOnly
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              {t('thisChat')}
            </button>
            {showCurrentChatOnly && (
              <span className="text-xs text-muted-foreground">
                {filteredBlocks.length} / {blocks.length} blocks
              </span>
            )}
          </div>

          {/* Search Bar - Only when blocks exist */}
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

        {/* Content - Conditional rendering based on state */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && blocks.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <Database className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t('noBlocksYet')}</p>
              <p className="text-xs text-muted-foreground">
                {t('agentsWillCreate')}
              </p>
            </div>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && filteredBlocks.length === 0 && searchQuery && blocks.length > 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t('noMatchingBlocks')}</p>
            </div>
          </div>
        )}

        {/* Blocks List - Grid layout, always collapsed preview cards */}
        {!loading && !error && filteredBlocks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBlocks.map((block) => (
              <AnalysisBlockRenderer
                key={block.id}
                block={block}
                isExpanded={false}
                isActive={activeBlockId === block.id}
                onToggle={() => setDetailViewBlockId(block.id)} // Open detail view
                onSelect={() => {}} // No-op, auto-managed now
                onUpdate={(updatedBlock) => {
                  // Update blocks state with the updated block
                  setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b))
                  console.log('✅ Block updated without page reload:', updatedBlock.id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
