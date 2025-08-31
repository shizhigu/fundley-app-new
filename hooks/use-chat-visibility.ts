'use client';

import type { VisibilityType } from '@/components/visibility-selector';

// Permanent chat doesn't need visibility management - always private to user
export function useChatVisibility({
  chatId,
  initialVisibilityType,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
}) {
  // In permanent chat architecture, visibility is always private
  const visibilityType: VisibilityType = 'private';
  
  // No-op function since permanent chat doesn't support visibility changes
  const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
    // Do nothing - permanent chat is always private
  };

  return { visibilityType, setVisibilityType };
}
