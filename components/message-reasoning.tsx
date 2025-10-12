'use client';

import { useState } from 'react';
import { ChevronDown, Loader2, Brain } from 'lucide-react';
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

  const hasContent = reasoning && reasoning.trim().length > 0;

  const toggleExpand = () => setIsExpanded(!isExpanded);

  if (!hasContent && !isLoading) return null;

  return (
    <div className="flex flex-col gap-1">
      {hasContent ? (
        <button
          data-testid="message-reasoning-toggle"
          type="button"
          onClick={toggleExpand}
          className="inline-flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-brand-avatar hover:border-brand-primary/20 transition-all duration-150 group"
        >
          <Brain className="w-3.5 h-3.5 text-brand-primary" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-brand-primary">
            {isLoading ? 'Reasoning...' : 'Reasoned for a few seconds'}
          </span>
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
      ) : (
        <div className="inline-flex items-center gap-2 px-2">
          <Brain className="w-3.5 h-3.5 text-brand-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Reasoning...
          </span>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && hasContent && (
          <motion.div
            data-testid="message-reasoning"
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: '0.5rem' }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
            className="pl-4 border-l-2 border-brand-primary/30"
          >
            <div className="text-xs leading-relaxed text-muted-foreground">
              <Markdown>{reasoning}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
