'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { AnalysisBlockRenderer } from './analysis-block-renderer'
import { getAnalysisBlocksSince } from '@/lib/actions/analysis-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3, Database, Search, X, MessageSquare, Library, ChevronDown, RefreshCw, Plus, Pin, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MovingBorder } from '@/components/aceternity/moving-border'
import { useChatContext } from '@/lib/contexts/chat-context'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { useBlockViewStore } from '@/stores/block-view-store'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActiveBlock } from '@/lib/hooks/use-active-block'

interface AnalysisBlocksPanelProps {
  chatId: string
  className?: string
}

export function AnalysisBlocksPanel({ chatId, className = '' }: AnalysisBlocksPanelProps) {
  const t = useTranslations('analysis')
  const { isLoading: isChatStreaming, blockToolCalled, switchedBlockId } = useChatContext()
  const { activeBlockId, setActiveBlock } = useBlockViewStore()

  // Redis sync for active block (auto-restore on mount, manual sync on open/close)
  const { activeBlock: redisActiveBlock, setActive: syncToRedis, clearActive: clearRedis } = useActiveBlock()

  // Quick filter for "This Chat" blocks
  const [showCurrentChatOnly, setShowCurrentChatOnly] = useState(false)

  // Sort order - restore from localStorage (keep this for UI preference)
  type SortOrder = 'updated' | 'created'
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blocks-sort-order')
      return (saved === 'created' || saved === 'updated') ? saved : 'updated'
    }
    return 'updated'
  })

  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)
  const [detailViewBlockId, setDetailViewBlockId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const lastTimestampRef = useRef<string | null>(null)
  const hasRestoredRef = useRef(false)

  // Restore active block from Redis once on mount (after page refresh)
  useEffect(() => {
    if (redisActiveBlock?.block_id && blocks.length > 0 && !hasRestoredRef.current) {
      const block = blocks.find(b => b.id === redisActiveBlock.block_id);
      if (block) {
        setDetailViewBlockId(redisActiveBlock.block_id);
        setActiveBlock(redisActiveBlock.block_id, redisActiveBlock.content || block);
        hasRestoredRef.current = true;
        console.log('🔄 Restored active block from Redis:', redisActiveBlock.block_id);
      }
    }
  }, [redisActiveBlock, blocks, setActiveBlock])

  // 过滤和排序blocks - 根据搜索关键词、"This Chat" 过滤器和排序顺序
  // 分离置顶和普通块
  const { pinnedBlocks, unpinnedBlocks } = useMemo(() => {
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
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((block) => {
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
    }

    // Separate pinned and unpinned blocks
    const pinned = filtered.filter(b => b.isPinned)
    const unpinned = filtered.filter(b => !b.isPinned)

    // Sort each group
    const sortBlocks = (blocksToSort: any[]) => {
      return [...blocksToSort].sort((a, b) => {
        if (sortOrder === 'updated') {
          // Sort by updated_at (most recent first)
          const aTime = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at).getTime()
          const bTime = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at).getTime()
          return bTime - aTime
        } else {
          // Sort by created_at (most recent first)
          const aTime = new Date(a.createdAt || a.created_at).getTime()
          const bTime = new Date(b.createdAt || b.created_at).getTime()
          return bTime - aTime
        }
      })
    }

    return {
      pinnedBlocks: sortBlocks(pinned),
      unpinnedBlocks: sortBlocks(unpinned)
    }
  }, [blocks, searchQuery, showCurrentChatOnly, chatId, sortOrder])

  // Combined for total count
  const filteredBlocks = useMemo(() => {
    return [...pinnedBlocks, ...unpinnedBlocks]
  }, [pinnedBlocks, unpinnedBlocks])

  // Handle pin toggle
  const handlePin = async (blockId: string, isPinned: boolean) => {
    // Optimistically update UI
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null } : b
    ))
    console.log(`📌 Block ${isPinned ? 'pinned' : 'unpinned'}:`, blockId)

    // Refresh from server to get accurate state
    await loadInitialBlocks()
  }

  // 初始加载 - 只在组件挂载时加载一次(Library view)
  useEffect(() => {
    loadInitialBlocks()
  }, []) // Empty deps - load once on mount

  // Track if we have a pending switch request
  const pendingSwitchRef = useRef<string | null>(null)

  // 监听 switch_analysis_block 工具调用，从 Redis 读取最新状态
  useEffect(() => {
    if (!switchedBlockId) return

    const handleSwitch = async () => {
      console.log(`🔄 Switch detected (timestamp: ${switchedBlockId.timestamp})`)

      // Mark as pending switch (to prevent Redis overwrite)
      pendingSwitchRef.current = 'switching'

      try {
        // Fetch latest active block from Redis (backend has already updated it)
        const response = await fetch('/api/user/active-block')
        if (!response.ok) throw new Error('Failed to fetch from Redis')

        const { block_id, content } = await response.json()

        if (!block_id) {
          console.warn('⚠️ No active block in Redis')
          pendingSwitchRef.current = null
          return
        }

        console.log('📥 Redis active block:', block_id)

        // Find the block in current list or reload
        let targetBlock = blocks.find(b => b.id === block_id)

        if (!targetBlock) {
          console.log('⏳ Block not in list, reloading...')
          const blocksRes = await fetch('/api/blocks')
          if (blocksRes.ok) {
            const { blocks: allBlocks } = await blocksRes.json()
            targetBlock = allBlocks.find((b: any) => b.id === block_id)
            setBlocks(allBlocks)
          }
        }

        if (targetBlock) {
          console.log(`✅ Switching to: ${content?.title || targetBlock.title}`)
          setDetailViewBlockId(block_id)
          setActiveBlock(block_id, content || targetBlock)
        }

        // Clear pending flag after a delay to ensure useEffect doesn't overwrite
        setTimeout(() => {
          pendingSwitchRef.current = null
          console.log('🔓 Switch complete, Redis sync re-enabled')
        }, 500)
      } catch (err) {
        console.error('❌ Switch failed:', err)
        pendingSwitchRef.current = null
      }
    }

    handleSwitch()
  }, [switchedBlockId, blocks, setActiveBlock])

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
      const currentActiveBlockId = activeBlockId

      setBlocks(prevBlocks => {
        // Find new blocks (not in previous list)
        const existingIds = new Set(prevBlocks.map(b => b.id))
        const uniqueNewBlocks = fetchedBlocks.filter((b: any) => !existingIds.has(b.id))

        if (uniqueNewBlocks.length > 0) {
          console.log(`📊 Polling: Found ${uniqueNewBlocks.length} new blocks`)
          foundNewOrUpdated = true
          // Note: Auto-open is now handled by Redis-based switch detection
          // Polling only updates the blocks list for display
        }

        // Check for updated blocks (content/title changed)
        const updatedList = fetchedBlocks.map((newBlock: any) => {
          const existing = prevBlocks.find(b => b.id === newBlock.id)
          if (existing) {
            // If content changed, use new version
            if (JSON.stringify(existing.content) !== JSON.stringify(newBlock.content)) {
              console.log(`🔄 Block ${newBlock.id} updated`)
              foundNewOrUpdated = true

              // If this is the currently active block, update store (Redis sync happens in detailView useEffect)
              if (newBlock.id === currentActiveBlockId) {
                console.log(`📝 Updating active block content in store: ${newBlock.id}`)
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

  // Auto-set active block when opening detail view (sync to Redis)
  useEffect(() => {
    if (detailViewBlockId && detailBlock) {
      // CRITICAL: Don't sync to Redis if we're in the middle of a switch
      // This prevents overwriting the correct block_id with stale data
      if (pendingSwitchRef.current) {
        console.log('⏸️  Skipping Redis sync during switch (pending:', pendingSwitchRef.current, ')');
        return;
      }

      // Only sync if the IDs match (prevents race condition where detailBlock lags behind detailViewBlockId)
      if (detailBlock.id !== detailViewBlockId) {
        console.log('⏸️  Skipping Redis sync - block data mismatch:', {
          detailViewBlockId,
          detailBlockId: detailBlock.id
        });
        return;
      }

      // Update Zustand store for UI state
      setActiveBlock(detailViewBlockId, detailBlock);

      // Sync minimal data to Redis for backend pre-hook (only id, title, content)
      const blockTitle = detailBlock.content?.title || detailBlock.title || 'Untitled Block';
      const minimalContent = {
        title: blockTitle,
        content: detailBlock.content, // Only the content field
      };
      syncToRedis(detailViewBlockId, minimalContent, blockTitle);
    }
    // Note: We don't clear Redis here when closing - that's done explicitly in the "Back to list" button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailViewBlockId, detailBlock]);

  return (
    <AnimatePresence mode="wait">
      {detailViewBlockId && detailBlock ? (
        // Detail view - full screen single block
        <motion.div
          key={`detail-${detailViewBlockId}`} // Key ensures animation triggers on block change
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{
            duration: 0.5,
            ease: [0.34, 1.56, 0.64, 1], // 弹性曲线 (cubic-bezier)
          }}
          className={`h-full ${className} flex flex-col`}
          style={{ width: '100%' }}
        >
        {/* Detail view header with back button */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <button
            onClick={() => {
              console.log('🔙 Back to list clicked - clearing detail view and Redis');
              setDetailViewBlockId(null);
              setActiveBlock(null, null);
              clearRedis(); // Clear from Redis when user explicitly closes
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
            onDelete={(blockId) => {
              // Remove block from list
              setBlocks(prev => prev.filter(b => b.id !== blockId))
              console.log('✅ Block removed from list:', blockId)
              // Also clear detail view since we just deleted it
              setDetailViewBlockId(null)
            }}
            onPin={handlePin}
          />
        </div>
      </motion.div>
      ) : (
        // List view - grid of cards
        <motion.div
          key="list-view"
          initial={{ opacity: 0, x: -60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{
            duration: 0.5,
            ease: [0.34, 1.56, 0.64, 1], // 弹性曲线 (cubic-bezier)
          }}
          className={`h-full ${className}`}
          style={{ width: '100%', overflow: 'auto' }}
        >
      <div className="space-y-4 p-4" style={{ maxWidth: '100%' }}>
        <div className="space-y-4 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t('analysisBlocks')}
            </h3>
            <div className="flex items-center gap-3">
              {/* Create new block button with MovingBorder effect */}
              <MovingBorder
                duration={2500}
                borderRadius="0.75rem"
                className="p-2"
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

                    // Update Zustand store (Redis sync will happen in detailView useEffect)
                    setActiveBlock(block.id, block)
                    console.log('✅ Created new block and set as active:', block.id)
                  } catch (error) {
                    console.error('Error creating block:', error)
                  }
                }}
                title={t('createBlock') || 'Create new block'}
              >
                <Plus className="h-4 w-4 text-primary" />
              </MovingBorder>

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

          {/* Quick Filter and Sort Controls */}
          <div className="flex items-center justify-between gap-4">
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

            {/* Sort Order Tabs */}
            <Tabs
              value={sortOrder}
              onValueChange={(value) => {
                const newSort = value as SortOrder
                setSortOrder(newSort)
                localStorage.setItem('blocks-sort-order', newSort)
              }}
              className="w-auto"
            >
              <TabsList className="h-9">
                <TabsTrigger value="updated" className="text-xs">
                  {t('sortByUpdated') || 'Recently Updated'}
                </TabsTrigger>
                <TabsTrigger value="created" className="text-xs">
                  {t('sortByCreated') || 'Recently Created'}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Bar - Only when blocks exist */}
          {blocks.length > 0 && (
            <div className="space-y-3">
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

              {/* Educational Hint */}
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                <div className="shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-primary/70" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('blocksPanelHint')}
                </p>
              </div>
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

        {/* Blocks List - Grid layout with pinned section */}
        {!loading && !error && filteredBlocks.length > 0 && (
          <div className="space-y-6">
            {/* Pinned Blocks Section */}
            {pinnedBlocks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Pin className="h-4 w-4" />
                    {t('pinnedBlocks')}
                  </h4>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{pinnedBlocks.length}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pinnedBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
                    >
                      {/* Subtle shimmer effect on hover */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                      <AnalysisBlockRenderer
                        block={block}
                        isExpanded={false}
                        isActive={activeBlockId === block.id}
                        onToggle={() => setDetailViewBlockId(block.id)}
                        onSelect={() => {}}
                        onUpdate={(updatedBlock) => {
                          setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b))
                          console.log('✅ Block updated without page reload:', updatedBlock.id)
                        }}
                        onDelete={(blockId) => {
                          setBlocks(prev => prev.filter(b => b.id !== blockId))
                          console.log('✅ Block removed from list:', blockId)
                        }}
                        onPin={handlePin}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Blocks Section */}
            {unpinnedBlocks.length > 0 && (
              <div className="space-y-3">
                {pinnedBlocks.length > 0 && (
                  <div className="flex items-center gap-2 px-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      All Blocks
                    </h4>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{unpinnedBlocks.length}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {unpinnedBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
                    >
                      {/* Subtle shimmer effect on hover */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                      <AnalysisBlockRenderer
                        block={block}
                        isExpanded={false}
                        isActive={activeBlockId === block.id}
                        onToggle={() => setDetailViewBlockId(block.id)}
                        onSelect={() => {}}
                        onUpdate={(updatedBlock) => {
                          setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b))
                          console.log('✅ Block updated without page reload:', updatedBlock.id)
                        }}
                        onDelete={(blockId) => {
                          setBlocks(prev => prev.filter(b => b.id !== blockId))
                          console.log('✅ Block removed from list:', blockId)
                        }}
                        onPin={handlePin}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
