'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatHeader } from '@/components/chat-header';
import { MultimodalInput } from '@/components/multimodal-input';
import { PreviewMessage } from '@/components/message';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { Greeting } from '@/components/greeting';
import { ChatLoading } from '@/components/chat-loading';
import type { ChatMessage } from '@/lib/types/chat';
import type { AuthSession } from '@/lib/auth/clerk';

interface Attachment {
  url: string;
  name: string;
  contentType: string;
  file?: File;
}

interface NewChatInterfaceProps {
  chatId: string;
  user: AuthSession['user'];
  initialChatModel: string;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string, files?: File[]) => Promise<void>;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isReadonly?: boolean;
}

/**
 * 新的聊天界面组件
 * 使用外部传入的状态和操作，不再自己管理状态
 */
export function NewChatInterface({
  chatId,
  user,
  initialChatModel,
  messages,
  isLoading,
  error,
  onSendMessage,
  onToggleSidebar,
  isSidebarOpen,
  isReadonly = false,
}: NewChatInterfaceProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // 滚动控制
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();

  // 发送消息处理
  const handleSendMessage = async (content: string, messageAttachments?: Attachment[]) => {
    if (!content.trim() || isLoading) return;

    try {
      // 提取文件
      const files = messageAttachments?.map(attachment => attachment.file).filter(Boolean) as File[];

      // 调用外部的发送消息函数
      await onSendMessage(content, files);

      // 发送后清空attachments
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // 显示错误状态
  if (error) {
    return (
      <div className="flex flex-col h-full w-full max-w-full relative">
        <ChatHeader
          chatId={chatId}
          selectedModelId={initialChatModel}
          selectedVisibilityType="private"
          isReadonly={isReadonly}
          user={user}
          onToggleSidebar={onToggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error</div>
            <div className="text-muted-foreground">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // 显示加载状态（当没有消息且正在加载时）
  if (messages.length === 0 && isLoading) {
    return (
      <div className="flex flex-col h-full w-full max-w-full relative">
        <ChatHeader
          chatId={chatId}
          selectedModelId={initialChatModel}
          selectedVisibilityType="private"
          isReadonly={isReadonly}
          user={user}
          onToggleSidebar={onToggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <div className="flex-1 min-h-0 max-w-full">
          <div
            ref={containerRef}
            className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 custom-scrollbar relative"
          >
            <div className="flex items-center justify-center h-full">
              <ChatLoading />
            </div>
          </div>
          <div ref={endRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full relative">
      <ChatHeader
        chatId={chatId}
        selectedModelId={initialChatModel}
        selectedVisibilityType="private"
        isReadonly={isReadonly}
        user={user}
        onToggleSidebar={onToggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex-1 min-h-0 max-w-full">
        <div
          ref={containerRef}
          className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 custom-scrollbar relative"
        >
          {/* 欢迎界面（无消息时显示） */}
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <Greeting user={user} />
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((message, index) => (
            <AnimatePresence key={message.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-4xl mx-auto"
              >
                <PreviewMessage
                  message={message}
                  isLoading={isLoading && index === messages.length - 1}
                  isLatest={index === messages.length - 1}
                  vote={undefined}
                  setMessages={() => {}} // 新架构中不需要直接修改消息
                  regenerate={() => {}} // TODO: 实现重新生成功能
                  isReadonly={isReadonly}
                />
              </motion.div>
            </AnimatePresence>
          ))}

          <div ref={endRef} />
        </div>
      </div>

      {/* 消息输入框 */}
      {!isReadonly && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 md:pb-6 pt-4">
          <MultimodalInput
            status={isLoading ? 'streaming' : 'ready'}
            stop={() => {}} // TODO: 实现停止功能
            attachments={attachments}
            setAttachments={setAttachments}
            messages={[]} // 新架构中不需要传递所有消息
            setMessages={() => {}}
            sendMessage={handleSendMessage}
            selectedVisibilityType="private"
            user={user}
            selectedModelId={initialChatModel}
            setSelectedModelId={() => {}}
            isAtBottom={isAtBottom}
            scrollToBottom={scrollToBottom}
          />
        </div>
      )}
    </div>
  );
}