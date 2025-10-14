'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import type { UseChatHelpers } from '@/lib/ai-sdk-types';
import type { ChatMessage } from '@/lib/types';
import { getTextFromMessage } from '@/lib/utils';

export interface MessageEditorProps {
  message: ChatMessage;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
}

export function MessageEditor({
  message,
  setMode,
  setMessages,
  regenerate,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftContent, setDraftContent] = useState(getTextFromMessage(message));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      autoAdjustHeight();
      // Focus at the end of text
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        draftContent.length,
        draftContent.length
      );
    }
  }, []);

  const autoAdjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    autoAdjustHeight();
  };

  const handleCancel = () => {
    setMode('view');
  };

  const handleSend = async () => {
    setIsSubmitting(true);

    try {
      // Delete trailing messages via API
      await fetch(`/api/messages/${message.id}/trailing`, {
        method: 'DELETE',
      }).catch(console.error);

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);
        if (index === -1) return messages;

        const updatedMessage: ChatMessage = {
          ...message,
          parts: [{ type: 'text', text: draftContent }],
        };

        return [...messages.slice(0, index), updatedMessage];
      });

      setMode('view');
      regenerate();
    } catch (error) {
      console.error('Failed to update message:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <Textarea
        data-testid="message-editor"
        ref={textareaRef}
        value={draftContent}
        onChange={handleInput}
        className="min-h-[80px] bg-card border border-border/50 rounded-xl resize-none text-base focus:border-brand-primary/50 transition-all duration-150"
        placeholder="Edit your message..."
      />

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={isSubmitting || !draftContent.trim()}
          className="gap-2 bg-brand-primary text-white hover:opacity-90"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
