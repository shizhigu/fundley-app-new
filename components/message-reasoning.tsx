'use client';

import { useState } from 'react';
import { ChevronDownIcon, LoaderIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Markdown } from './markdown';

interface MessageReasoningProps {
  isLoading: boolean;
  reasoning: string;
}

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '0.5rem',
      marginBottom: '0.25rem',
    },
  };

  return (
    <div className="flex flex-col">
      {isLoading ? (
        <div className="flex flex-row gap-2 items-center">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Reasoning</div>
          <div className="animate-spin scale-75">
            <LoaderIcon />
          </div>
        </div>
      ) : (
        <button
          data-testid="message-reasoning-toggle"
          type="button"
          className="flex flex-row gap-2 items-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors duration-200"
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
        >
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Reasoned for a few seconds</div>
          <div
            className={`scale-75 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <ChevronDownIcon />
          </div>
        </button>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            data-testid="message-reasoning"
            key="content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="pl-3 text-xs leading-tight text-zinc-400 dark:text-zinc-500 border-l border-zinc-200 dark:border-zinc-700 flex flex-col gap-2"
          >
            <div className="reasoning-content">
              <Markdown>{reasoning}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
