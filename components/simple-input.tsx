'use client';

import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ArrowUpIcon } from './icons';

interface SimpleInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function SimpleInput({ onSendMessage, disabled = false }: SimpleInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;

    onSendMessage(input.trim());
    setInput('');

    // Auto-resize textarea back to default
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="发送消息..."
          disabled={disabled}
          className="min-h-[40px] max-h-[200px] resize-none pr-12"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          size="sm"
          className="absolute right-2 bottom-2 h-8 w-8 p-0"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}