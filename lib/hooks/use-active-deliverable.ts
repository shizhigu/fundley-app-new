/**
 * useActiveDeliverable Hook
 *
 * Simple Redis sync for active deliverable state:
 * - Fetches once on mount to restore after page refresh
 * - Provides methods to update/clear Redis
 * - Backend pre-hook reads from Redis automatically
 */

import { useState, useEffect, useRef } from 'react';

export interface ActiveDeliverableData {
  block_id: string | null;
  content: any | null;
}

export function useActiveDeliverable() {
  const [activeDeliverable, setActiveDeliverable] = useState<ActiveDeliverableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  // Fetch active deliverable once on mount (restore after page refresh)
  useEffect(() => {
    if (hasFetchedRef.current) return;

    const fetchInitialActiveDeliverable = async () => {
      try {
        const response = await fetch('/api/user/active-block');

        if (!response.ok) {
          if (response.status === 401) return; // Not logged in yet
          throw new Error(
            `Failed to fetch active deliverable: ${response.statusText}`,
          );
        }

        const data: ActiveDeliverableData = await response.json();

        if (data.block_id) {
          setActiveDeliverable(data);
        }
      } catch (err) {
        // Non-fatal: no active deliverable to restore
        console.warn('Could not restore active deliverable:', err);
      } finally {
        hasFetchedRef.current = true;
      }
    };

    fetchInitialActiveDeliverable();
  }, []);

  /**
   * Sync active deliverable to Redis (for backend pre-hook to read)
   */
  const setActive = async (deliverableId: string, content: any, title?: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/active-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_id: deliverableId, content, title }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set active deliverable: ${response.statusText}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear active deliverable from Redis
   */
  const clearActive = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/active-block', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to clear active deliverable: ${response.statusText}`);
      }

      setActiveDeliverable(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    activeDeliverable,
    isLoading,
    setActive,
    clearActive,
  };
}
