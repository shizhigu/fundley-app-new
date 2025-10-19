'use client';

import { useDevModeStore } from '@/stores/dev-mode-store';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Developer mode indicator
 * Shows a badge in the bottom-right corner when dev mode is enabled
 */
export function DevModeIndicator() {
  const { isEnabled, disable } = useDevModeStore();

  return (
    <AnimatePresence>
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg',
              'bg-orange-500/10 border border-orange-500/30',
              'shadow-lg backdrop-blur-sm',
              'text-orange-600 dark:text-orange-400'
            )}
          >
            <Wrench className="w-4 h-4" />
            <span className="text-xs font-medium">Developer Mode</span>
            <button
              onClick={disable}
              className="ml-1 p-0.5 rounded hover:bg-orange-500/20 transition-colors"
              title="Disable developer mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
