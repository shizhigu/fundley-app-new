'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useChat } from '@/lib/hooks/use-chat';
import type { ChatState, ChatActions } from '@/lib/types/chat';

type ChatContextType = (ChatState & ChatActions) | null;

const ChatContext = createContext<ChatContextType>(null);

/**
 * ChatProvider - 提供全局聊天状态
 * 确保整个应用只有一个useChat实例，避免重复API调用
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const chat = useChat();

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * useChatContext - 从Context获取聊天状态
 * 所有组件应该使用这个hook而不是直接调用useChat()
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
