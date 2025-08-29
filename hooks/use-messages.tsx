import { useState, useEffect, useRef, useCallback } from 'react';
import { useScrollToBottom } from './use-scroll-to-bottom';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';

export function useMessages({
  chatId,
  status,
  messages,
}: {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
}) {
  const {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
  } = useScrollToBottom();

  const [hasSentMessage, setHasSentMessage] = useState(false);
  const previousMessagesLength = useRef(messages?.length || 0);
  const previousLastMessageContent = useRef<string>('');
  
  // Get the content of the last message for comparison
  const getLastMessageContent = useCallback(() => {
    if (!messages || messages.length === 0) return '';
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant' && Array.isArray(lastMessage.content)) {
      return lastMessage.content.map(part => 
        typeof part === 'string' ? part : (part.text || '')
      ).join('');
    }
    return typeof lastMessage.content === 'string' ? lastMessage.content : '';
  }, [messages]);

  // Auto-scroll on chat switch
  useEffect(() => {
    if (chatId) {
      scrollToBottom('instant');
      setHasSentMessage(false);
      previousMessagesLength.current = messages?.length || 0;
      previousLastMessageContent.current = getLastMessageContent();
    }
  }, [chatId, scrollToBottom, messages?.length, getLastMessageContent]);

  // Auto-scroll on user message submission
  useEffect(() => {
    if (status === 'submitted') {
      setHasSentMessage(true);
      scrollToBottom('smooth');
    }
  }, [status, scrollToBottom]);

  // Auto-scroll during streaming and content updates
  useEffect(() => {
    const currentLength = messages?.length || 0;
    const currentLastContent = getLastMessageContent();
    
    // New message added
    if (currentLength > previousMessagesLength.current) {
      if (isAtBottom || status === 'streaming') {
        scrollToBottom('smooth');
      }
      previousMessagesLength.current = currentLength;
    }
    
    // Existing message content updated (streaming)
    if (currentLastContent !== previousLastMessageContent.current && currentLastContent.length > previousLastMessageContent.current.length) {
      if (isAtBottom || status === 'streaming') {
        // Use a slight delay to ensure DOM updates are complete
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
      previousLastMessageContent.current = currentLastContent;
    }
  }, [messages, isAtBottom, status, scrollToBottom, getLastMessageContent]);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  };
}
