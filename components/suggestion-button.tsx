'use client';

import { Lightbulb, ArrowRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SuggestionButtonProps {
  text: string;
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'subtle';
  containsRealData?: boolean;
  verificationMessage?: string;
}

/**
 * Interactive suggestion button for next actions
 */
export function SuggestionButton({ 
  text, 
  onClick, 
  className,
  variant = 'default',
  containsRealData = false,
  verificationMessage
}: SuggestionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs",
        "transition-all duration-200",
        "focus:outline-none focus:ring-1 focus:ring-offset-1",
        "bg-gray-50/60 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/20",
        "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
        "hover:bg-gray-100/60 dark:hover:bg-gray-700/40 hover:border-gray-300/40 dark:hover:border-gray-600/30",
        "opacity-75 hover:opacity-100",
        "focus:ring-gray-400/20",
        className
      )}
      title={containsRealData && verificationMessage ? verificationMessage : undefined}
    >
      <Lightbulb className="w-3 h-3 flex-shrink-0 text-amber-500/70" />
      <span className="truncate font-medium">{text}</span>
      
      <ArrowRight className={cn(
        "w-3 h-3 flex-shrink-0 opacity-0 -translate-x-0.5",
        "group-hover:opacity-60 group-hover:translate-x-0",
        "transition-all duration-200"
      )} />
    </button>
  );
}

/**
 * Group of suggestion buttons with consistent layout
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
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 opacity-60">
        <Lightbulb className="w-3 h-3" />
        <span>Suggested next steps</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          // Handle both string array (legacy) and object array (new format)
          const suggestionObj = typeof suggestion === 'string' 
            ? { text: suggestion, containsRealData: false, verificationMessage: undefined }
            : suggestion;
            
          return (
            <SuggestionButton
              key={index}
              text={suggestionObj.text}
              onClick={() => onSuggestionClick(suggestionObj.text)}
              variant="default"
              containsRealData={suggestionObj.containsRealData}
              verificationMessage={suggestionObj.verificationMessage}
            />
          );
        })}
      </div>
    </div>
  );
}