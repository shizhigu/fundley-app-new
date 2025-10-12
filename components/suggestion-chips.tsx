'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Suggestion {
  label: string;
  prompt: string;
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
}

export function SuggestionChips({ suggestions }: SuggestionChipsProps) {
  const handleSelect = (prompt: string) => {
    // Dispatch template-prefill event to populate input
    window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
  };

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={() => handleSelect(suggestion.prompt)}
          className="h-auto py-2 px-3 text-sm rounded-full border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          {suggestion.label}
        </Button>
      ))}
    </div>
  );
}
