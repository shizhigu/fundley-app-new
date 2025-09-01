import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from './greeting';
import { memo, useMemo } from 'react';
import type { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { ChatLoading } from './chat-loading';
import { usePathname } from 'next/navigation';

interface MessagesProps {
  status: UseChatHelpers<ChatMessage>['status'];
  votes: Array<Vote> | undefined;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
}

function PureMessages({
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    status,
    messages,
  });

  useDataStream();
  
  const pathname = usePathname();
  const isNewChatLoading = pathname.includes('/chat/') && !pathname.includes('/permanent') && messages.length === 0 && status !== 'idle';

  // Optimize message rendering to save memory
  const MAX_VISIBLE_MESSAGES = 30; // Show last 30 messages (about 15 conversations)
  
  const { visibleMessages, hiddenCount } = useMemo(() => {
    if (messages.length <= MAX_VISIBLE_MESSAGES) {
      return { visibleMessages: messages, hiddenCount: 0 };
    }
    
    const hidden = messages.length - MAX_VISIBLE_MESSAGES;
    const visible = messages.slice(-MAX_VISIBLE_MESSAGES);
    
    return { visibleMessages: visible, hiddenCount: hidden };
  }, [messages]);

  // Show loading state when switching chats
  if (isNewChatLoading) {
    return (
      <div
        ref={messagesContainerRef}
        className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 custom-scrollbar relative"
        style={{ background: 'transparent !important' }}
      >
        <ChatLoading />
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 custom-scrollbar relative"
      style={{ background: 'transparent !important' }}
    >
      {messages.length === 0 && <Greeting />}
      
      {hiddenCount > 0 && (
        <div className="text-center py-3 px-4 mx-auto rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <div className="font-medium">{hiddenCount} earlier messages hidden</div>
          <div className="text-xs mt-1">To save memory and improve performance</div>
        </div>
      )}

      {visibleMessages.map((message, index) => {
        const originalIndex = messages.indexOf(message);
        return (
          <PreviewMessage
            key={message.id}
            message={message}
            isLoading={status === 'streaming' && messages.length - 1 === originalIndex}
            vote={
              votes
                ? votes.find((vote) => vote.messageId === message.id)
                : undefined
            }
            setMessages={setMessages}
            regenerate={regenerate}
            isReadonly={isReadonly}
            requiresScrollPadding={
              hasSentMessage && originalIndex === messages.length - 1
            }
          />
        );
      })}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;

  return false;
});
