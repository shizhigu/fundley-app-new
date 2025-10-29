'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { MultimodalInput } from '@/components/multimodal-input';
import { PreviewMessage } from '@/components/message';
import { InvocationGroup } from '@/components/invocation-group';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { useDeliverableViewStore } from '@/stores/deliverable-view-store';
import { TextAnimate } from '@/components/ui/text-animate';
import { BorderBeam } from '@/components/ui/border-beam';
import { LoadingDots } from '@/components/ui/loading-dots';
import type { ChatMessage } from '@/lib/types/chat';
import type { MessageInvocation, Attachment } from '@/lib/types';
import type { AuthSession } from '@/lib/auth/clerk';

/**
 * Display Message Box - Professional 2025 Design
 * Clean, elegant status display with subtle animations
 * Shows timer always when loading, with optional message
 * Message clears when stream ends (conversation_complete event)
 * TextAnimate loops every 4 seconds for continuous visual feedback
 */
function DisplayMessageBox({ message }: { message?: string | null }) {
  const [elapsed, setElapsed] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  // Timer - always running during loading
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Don't reset on message change

  // Loop animation: restart every 4 seconds when message exists
  useEffect(() => {
    if (message) {
      // Immediate first animation
      setAnimationKey((prev) => prev + 1);

      // Then loop every 4 seconds
      const loopInterval = setInterval(() => {
        setAnimationKey((prev) => prev + 1);
      }, 4000);

      return () => clearInterval(loopInterval);
    }
  }, [message]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex justify-center px-4 mb-4"
    >
      {/* Combined Timer + Message Box - Professional Style with Animated Border */}
      <div className="relative backdrop-blur-xl bg-gradient-to-br from-background/90 via-background/85 to-background/90 border border-border/40 rounded-xl px-6 py-3 shadow-2xl max-w-2xl overflow-hidden">
        {/* Subtle inner glow to enhance BorderBeam visibility */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-xl pointer-events-none" />

        <div className="relative flex items-center justify-center gap-3 z-10">
          {/* Timer - Always visible, larger font */}
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm font-mono text-muted-foreground/80 tracking-wide shrink-0 font-semibold"
          >
            {formatTime(elapsed)}
          </motion.span>

          {/* Message text with TextAnimate OR Loading Dots */}
          {message ? (
            <TextAnimate
              key={animationKey}
              animation="blurInUp"
              by="character"
              startOnView={false}
              className="text-xs font-medium text-center text-muted-foreground/70"
            >
              {message}
            </TextAnimate>
          ) : (
            <LoadingDots />
          )}
        </div>

        {/* Animated Border Beam Effect */}
        <BorderBeam
          size={150}
          initialOffset={30}
          borderWidth={2}
          className="from-blue-500 via-purple-500 to-blue-500"
          transition={{
            type: 'spring',
            stiffness: 50,
            damping: 15,
          }}
        />
      </div>
    </motion.div>
  );
}

interface NewChatInterfaceProps {
  chatId: string;
  user: AuthSession['user'];
  messages: ChatMessage[];
  groupedMessages?: MessageInvocation[]; // Add grouped messages support
  isLoading: boolean;
  error: string | null;
  onSendMessage: (
    content: string,
    files?: File[],
    blockId?: string,
  ) => Promise<void>;
  setLoading?: (loading: boolean) => void; // 立即设置loading状态
  isReadonly?: boolean;
  currentDisplayMessage?: string | null; // 实时状态显示
}

/**
 * 新的聊天界面组件
 * 使用外部传入的状态和操作，不再自己管理状态
 */
export function NewChatInterface({
  chatId,
  user,
  messages,
  groupedMessages = [],
  isLoading,
  error,
  onSendMessage,
  setLoading,
  isReadonly = false,
  currentDisplayMessage, // 新增：实时状态显示
}: NewChatInterfaceProps) {
  const t = useTranslations('common');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const { activeDeliverableId } = useDeliverableViewStore();

  // 滚动控制
  const { containerRef, endRef, isAtBottom, scrollToBottom } =
    useScrollToBottom();

  // Auto-scroll to bottom when chat changes or messages load
  useEffect(() => {
    // Wait for messages to render, then scroll to bottom
    const timer = setTimeout(() => {
      if (messages.length > 0) {
        scrollToBottom();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [chatId, messages.length, scrollToBottom]);

  // 发送消息处理
  const handleSendMessage = async (
    content: string,
    messageAttachments?: Attachment[],
  ) => {
    if (!content.trim() || isLoading) return;

    try {
      // 立即设置loading状态，让计时器马上显示
      if (setLoading) {
        setLoading(true);
      }

      // 提取文件
      const files = messageAttachments
        ?.map((attachment) => attachment.file)
        .filter(Boolean) as File[];

      // 调用外部的发送消息函数，传递当前激活的 deliverableId
      await onSendMessage(content, files, activeDeliverableId || undefined);

      // 发送后清空attachments
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // 发生错误时重置loading状态
      if (setLoading) {
        setLoading(false);
      }
    }
  };

  // 不再显示错误覆盖整个页面，改用 toast 通知
  // error 信息会在 use-chat hook 中通过 toast 显示

  // 显示加载状态（当没有消息且正在加载时）
  if (messages.length === 0 && isLoading) {
    return (
      <div className="flex flex-col h-full w-full max-w-full relative">
        <div className="flex-1 min-h-0 max-w-full">
          <div
            ref={containerRef}
            className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 relative"
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">{t('loadingChat')}</div>
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
          className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 relative"
        >
          {/* 欢迎界面（无消息时显示） */}
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {t('welcome')}
                </h2>
                <p className="text-muted-foreground">
                  {t('welcomeDescription')}
                </p>
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

      {/* 消息输入框 + 状态显示 */}
      {!isReadonly && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 md:pb-6 pt-4">
          {/* 实时状态显示框 - 在输入框上方，相对定位 */}
          <AnimatePresence>
            {isLoading && <DisplayMessageBox message={currentDisplayMessage} />}
          </AnimatePresence>

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
            isAtBottom={isAtBottom}
            scrollToBottom={scrollToBottom}
            chatId={chatId}
          />
        </div>
      )}
    </div>
  );
}
