/**
 * useActiveBlock Hook
 *
 * Simple Redis sync for active block state:
 * - Fetches once on mount to restore after page refresh
 * - Provides methods to update/clear Redis
 * - Backend pre-hook reads from Redis automatically
 */

import { useState, useEffect, useRef } from 'react';

export interface ActiveBlockData {
  block_id: string | null;
  content: any | null;
}

export function useActiveBlock() {
  const [activeBlock, setActiveBlock] = useState<ActiveBlockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  // Fetch active block once on mount (restore after page refresh)
  useEffect(() => {
    if (hasFetchedRef.current) return;

    const fetchInitialActiveBlock = async () => {
      try {
        const response = await fetch('/api/user/active-block');

        if (!response.ok) {
          if (response.status === 401) return; // Not logged in yet
          throw new Error(
            `Failed to fetch active block: ${response.statusText}`,
          );
        }

        const data: ActiveBlockData = await response.json();

        if (data.block_id) {
          setActiveBlock(data);
        }
      } catch (err) {
        // Non-fatal: no active block to restore
        console.warn('Could not restore active block:', err);
      } finally {
        hasFetchedRef.current = true;
      }
    };

    fetchInitialActiveBlock();
  }, []);

  /**
   * Sync active block to Redis (for backend pre-hook to read)
   */
  const setActive = async (blockId: string, content: any, title?: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/active-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_id: blockId, content, title }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set active block: ${response.statusText}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear active block from Redis
   */
  const clearActive = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/active-block', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to clear active block: ${response.statusText}`);
      }

      setActiveBlock(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    activeBlock,
    isLoading,
    setActive,
    clearActive,
  };
}
