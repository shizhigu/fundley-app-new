'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MultimodalInput } from '@/components/multimodal-input';
import { PreviewMessage } from '@/components/message';
import { InvocationGroup } from '@/components/invocation-group';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import type { ChatMessage } from '@/lib/types/chat';
import type { MessageInvocation, Attachment } from '@/lib/types';
import type { AuthSession } from '@/lib/auth/clerk';

interface NewChatInterfaceProps {
  chatId: string;
  user: AuthSession['user'];
  initialChatModel: string;
  messages: ChatMessage[];
  groupedMessages?: MessageInvocation[]; // Add grouped messages support
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string, files?: File[]) => Promise<void>;
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
  groupedMessages = [],
  isLoading,
  error,
  onSendMessage,
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
        <div className="flex-1 min-h-0 max-w-full">
          <div
            ref={containerRef}
            className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 custom-scrollbar relative"
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading chat...</div>
            </div>
          </div>
          <div ref={endRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full relative">

      <div className="flex-1 min-h-0 max-w-full">
        <div
          ref={containerRef}
          className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 custom-scrollbar relative"
        >
          {/* 欢迎界面（无消息时显示） */}
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">欢迎使用 Fundley</h2>
                <p className="text-muted-foreground">开始对话以获取财务分析</p>
              </div>
            </div>
          )}

          {/* 统一使用分组渲染（包括单独消息的伪分组） */}
          {groupedMessages.map((invocation, index) => (
            <AnimatePresence key={invocation.invocationId}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-4xl mx-auto"
              >
                <InvocationGroup invocation={invocation} />
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