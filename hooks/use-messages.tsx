import { useState, useEffect, useRef, useCallback } from 'react';
import { useScrollToBottom } from './use-scroll-to-bottom';
import type { UseChatHelpers } from '@/lib/ai-sdk-types';
import type { ChatMessage } from '@/lib/types';

export function useMessages({
  status,
  messages,
}: {
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
}) {
  const {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
  } = useScrollToBottom();

  const [hasSentMessage, setHasSentMessage] = useState(false);
  const previousMessagesLength = useRef(messages?.length || 0);
  const previousLastMessageContent = useRef<string>('');
  
  // Get the content of the last message for comparison
  const getLastMessageContent = useCallback(() => {
    if (!messages || messages.length === 0) return '';
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant' && Array.isArray(lastMessage.parts)) {
      return lastMessage.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text || '')
        .join('');
    }
    return Array.isArray(lastMessage.parts) && lastMessage.parts[0] 
      ? (lastMessage.parts[0].type === 'text' ? (lastMessage.parts[0] as any).text || '' : '')
      : '';
  }, [messages]);

  // Auto-scroll on messages load
  useEffect(() => {
    scrollToBottom();
    setHasSentMessage(false);
    previousMessagesLength.current = messages?.length || 0;
    previousLastMessageContent.current = getLastMessageContent();
  }, [scrollToBottom, messages?.length, getLastMessageContent]);

  // Auto-scroll on user message submission
  useEffect(() => {
    if (status === 'submitted') {
      setHasSentMessage(true);
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  // Auto-scroll during streaming and content updates
  useEffect(() => {
    const currentLength = messages?.length || 0;
    const currentLastContent = getLastMessageContent();
    
    // New message added
    if (currentLength > previousMessagesLength.current) {
      if (isAtBottom || status === 'streaming') {
        scrollToBottom();
      }
      previousMessagesLength.current = currentLength;
    }

    // Existing message content updated (streaming)
    if (currentLastContent !== previousLastMessageContent.current && currentLastContent.length > previousLastMessageContent.current.length) {
      if (isAtBottom || status === 'streaming') {
        // Use a slight delay to ensure DOM updates are complete
        setTimeout(() => scrollToBottom(), 100);
      }
      previousLastMessageContent.current = currentLastContent;
    }
  }, [messages, isAtBottom, status, scrollToBottom, getLastMessageContent]);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  };
}
