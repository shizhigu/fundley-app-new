'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useDevModeStore } from '@/stores/dev-mode-store';

/**
 * Global keyboard shortcut listener for developer mode
 * Cmd/Ctrl + Shift + D toggles developer mode
 */
export function DevModeShortcut() {
  const { isEnabled, toggle } = useDevModeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Shift + D
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggle();
        toast.success(
          isEnabled
            ? '👨‍💻 Developer mode disabled'
            : '🛠️ Developer mode enabled',
          {
            description: isEnabled
              ? 'Tool call details hidden'
              : 'Tool call details are now visible',
            duration: 3000,
          }
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, toggle]);

  return null; // This component doesn't render anything
}
