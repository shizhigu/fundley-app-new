'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SuggestionButtonProps {
  text: string;
  onClick: () => void;
  className?: string;
  containsRealData?: boolean;
  verificationMessage?: string;
}

/**
 * Ultra-Premium 2025 Suggestion Button
 * Clean, minimal, professional
 */
export function SuggestionButton({
  text,
  onClick,
  className,
  containsRealData = false,
  verificationMessage
}: SuggestionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Clean button base
        'group inline-flex items-start gap-2 px-3 py-2 rounded-lg',
        // Minimal styling
        'bg-card border border-border',
        'text-sm text-foreground',
        // Professional hover
        'hover:bg-muted hover:border-border transition-colors duration-200',
        // Focus state
        'focus:outline-none focus:ring-1 focus:ring-brand-primary/20',
        className
      )}
      title={containsRealData && verificationMessage ? verificationMessage : undefined}
    >
      <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-brand-primary mt-0.5" />
      <span className="flex-1 text-left font-medium break-words">{text}</span>
      <ArrowRight className={cn(
        "w-3.5 h-3.5 flex-shrink-0 opacity-0 -translate-x-1 mt-0.5",
        "group-hover:opacity-50 group-hover:translate-x-0",
        "transition-all duration-200"
      )} />
    </button>
  );
}

/**
 * Group of suggestion buttons with clean layout
 */
export function SuggestionButtonGroup({
  suggestions,
  onSuggestionClick,
  className
}: {
  suggestions: string[] | { text: string, containsRealData: boolean, verificationMessage?: string }[];
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}) {
  if (!suggestions.length) return null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
        <span>Suggested next steps</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const suggestionObj = typeof suggestion === 'string'
            ? { text: suggestion, containsRealData: false, verificationMessage: undefined }
            : suggestion;

          return (
            <SuggestionButton
              key={index}
              text={suggestionObj.text}
              onClick={() => onSuggestionClick(suggestionObj.text)}
              containsRealData={suggestionObj.containsRealData}
              verificationMessage={suggestionObj.verificationMessage}
            />
          );
        })}
      </div>
    </div>
  );
}
