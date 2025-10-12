'use client';

import { Sparkles } from 'lucide-react';

interface Suggestion {
  label: string;
  prompt: string;
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
}

/**
 * Ultra-Premium 2025 Suggestion Chips
 * Clean pill-style buttons for quick prompts
 */
export function SuggestionChips({ suggestions }: SuggestionChipsProps) {
  const handleSelect = (prompt: string) => {
    window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
  };

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSelect(suggestion.prompt)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-brand-primary/30 transition-colors duration-200"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}
