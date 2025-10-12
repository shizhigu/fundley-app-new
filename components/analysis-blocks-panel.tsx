'use client';

import { useEffect, useState, useRef } from 'react';
import { AlertCircle, BarChart3, Database, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnalysisBlockRenderer } from './analysis-block-renderer';
import { getAnalysisBlocksSince } from '@/lib/actions/analysis-blocks';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatContext } from '@/lib/contexts/chat-context';

interface AnalysisBlocksPanelProps {
  chatId: string;
  className?: string;
}

export function AnalysisBlocksPanel({ chatId, className = '' }: AnalysisBlocksPanelProps) {
  const { isLoading: isChatStreaming } = useChatContext();
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load - reload when chat changes
  useEffect(() => {
    // Reset state
    setBlocks([]);
    setExpandedBlockId(null);
    lastTimestampRef.current = null;

    loadInitialBlocks();

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [chatId]);

  // Poll only during chat streaming
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Only poll during streaming
    if (isChatStreaming) {
      pollIntervalRef.current = setInterval(() => {
        checkForNewBlocks();
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [chatId, isChatStreaming]);

  const loadInitialBlocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedBlocks = await getAnalysisBlocksSince(chatId);

      setBlocks(fetchedBlocks);

      // Track latest timestamp and auto-expand latest block
      if (fetchedBlocks.length > 0) {
        const latestBlock = fetchedBlocks[fetchedBlocks.length - 1];
        lastTimestampRef.current = latestBlock.created_at;
        setExpandedBlockId(latestBlock.id);
      }
    } catch (err) {
      console.error('Failed to load analysis blocks:', err);
      setError('Failed to load analysis blocks');
    } finally {
      setLoading(false);
    }
  };

  const checkForNewBlocks = async () => {
    if (!lastTimestampRef.current) {
      // Initial load if no timestamp
      const fetchedBlocks = await getAnalysisBlocksSince(chatId);
      if (fetchedBlocks.length > 0) {
        setBlocks(fetchedBlocks);
        const latestBlock = fetchedBlocks[fetchedBlocks.length - 1];
        lastTimestampRef.current = latestBlock.created_at;
        setExpandedBlockId(latestBlock.id);
      }
      return;
    }

    try {
      const newBlocks = await getAnalysisBlocksSince(chatId, lastTimestampRef.current);

      if (newBlocks.length > 0) {
        // Incremental update: add new blocks without replacing entire list
        setBlocks((prevBlocks) => {
          // Deduplicate: avoid duplicate additions
          const existingIds = new Set(prevBlocks.map((b) => b.id));
          const uniqueNewBlocks = newBlocks.filter((b) => !existingIds.has(b.id));

          if (uniqueNewBlocks.length > 0) {
            console.log(`📊 Found ${uniqueNewBlocks.length} new blocks`);
            // Update latest timestamp
            lastTimestampRef.current = uniqueNewBlocks[uniqueNewBlocks.length - 1].created_at;
            // Auto-expand latest block, collapse others
            const latestBlock = uniqueNewBlocks[uniqueNewBlocks.length - 1];
            setExpandedBlockId(latestBlock.id);
            return [...prevBlocks, ...uniqueNewBlocks];
          }

          return prevBlocks;
        });
      }
    } catch (err) {
      console.error('Failed to check for new blocks:', err);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 p-4 bg-background ${className}`}>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 bg-background ${className}`}>
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-background ${className}`}>
        <div className="text-center space-y-3">
          <Database className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <div>
            <p className="text-sm text-foreground font-medium">No analysis blocks yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              AI agents will create blocks as they analyze data
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-auto bg-background ${className}`}>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-brand-primary" />
            Analysis Blocks
          </h3>
          <div className="flex items-center gap-3">
            {/* Block count badge */}
            <div className="px-3 py-1.5 rounded-full bg-card border border-border">
              <span className="text-sm font-medium text-foreground">
                {blocks.length} block{blocks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Live indicator - only during streaming */}
            {isChatStreaming && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20"
              >
                <div className="w-2 h-2 bg-brand-primary rounded-full" />
                <span className="text-xs font-medium text-brand-primary">Live</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Blocks list */}
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
  );
}
