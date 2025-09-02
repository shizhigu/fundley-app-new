'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { NavigationSidebar } from '@/components/navigation-sidebar';
import type { AuthSession } from '@/lib/auth/clerk';

interface ChatContextType {
  selectedChatId: string | undefined;
  setSelectedChatId: (chatId: string | undefined) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatLayoutProvider');
  }
  return context;
}

interface ChatLayoutProviderProps {
  session: AuthSession | null;
  children: React.ReactNode;
}

export function ChatLayoutProvider({ session, children }: ChatLayoutProviderProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);

  // 🔄 Load last selected chat from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastSelectedChatId = localStorage.getItem('lastSelectedChatId');
      if (lastSelectedChatId) {
        console.log('🔄 Restoring last selected chat:', lastSelectedChatId);
        setSelectedChatId(lastSelectedChatId);
      }
    }
  }, []);

  const handleChatSelect = (chatId: string) => {
    console.log('💾 Saving selected chat to localStorage:', chatId);
    setSelectedChatId(chatId);
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedChatId', chatId);
    }
  };

  return (
    <ChatContext.Provider value={{ selectedChatId, setSelectedChatId }}>
      <div className="professional-layout flex max-w-full">
        <NavigationSidebar 
          user={session?.user}
          selectedChatId={selectedChatId}
          onChatSelect={handleChatSelect}
        />
        <div className="flex-1 max-w-full min-w-0 h-full">
          {children}
        </div>
      </div>
    </ChatContext.Provider>
  );
}