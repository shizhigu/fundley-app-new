'use client';

import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatHeader } from '@/components/chat-header';
import { MultimodalInput } from './multimodal-input';
import { PreviewMessage } from './message';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { useSQLQuery } from '@/lib/hooks/use-sql-query';
import { useFinancialDataStore } from '@/lib/stores/financial-data-store';
import type { AuthSession } from '@/lib/auth/clerk';
import { toast } from './toast';
import { Greeting } from './greeting';
import { ChatLoading } from './chat-loading';
import { usePathname } from 'next/navigation';

interface Attachment {
  url: string;
  name: string;
  contentType: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_name?: string;
  tool_args?: any;
  tool_result?: any;
  timestamp: string;
  parts?: Array<{ type: string; [key: string]: any }>;
}

interface ChatInterfaceProps {
  chatId: string;
  initialChatModel: string;
  user: AuthSession['user'];
  isReadonly?: boolean;
}

export function ChatInterface({
  chatId,
  initialChatModel,
  user,
  isReadonly = false,
}: ChatInterfaceProps) {

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 获取available metrics from store (精确订阅，避免不必要的重渲染)
  const financialData = useFinancialDataStore((state) => state.financialData);

  // 获取历史消息
  const { data: messagesData } = useSQLQuery<{ messages: Message[] }>(
    chatId ? `/api/chats/${chatId}/messages` : null,
    { enabled: !!chatId }
  );

  // 转换消息格式，处理工具结果
  const convertMessage = (msg: any): Message => {
    let parts = msg.parts || [{ type: 'text', text: msg.content || '' }];

    // 检查tool_result是否包含frontend_visualization
    if (msg.role === 'tool' && msg.tool_result) {
      let toolResult;
      try {
        toolResult = typeof msg.tool_result === 'string'
          ? JSON.parse(msg.tool_result)
          : msg.tool_result;
      } catch (e) {
        toolResult = msg.tool_result;
      }

      // 检查是否是frontend_visualization类型
      if (toolResult && toolResult.type === 'frontend_visualization' && toolResult.chartjsConfig) {

        // 只显示可视化，不显示工具完成的文字
        parts = [
          {
            type: 'visualization',
            chartjsConfig: toolResult.chartjsConfig,
            title: toolResult.title || 'Chart',
            description: toolResult.description || 'Generated visualization'
          }
        ];
      }
      // 检查是否是web_search工具
      else if (msg.tool_name === 'web_search' && toolResult) {

        // 构造WebSearchResultCard需要的数据格式
        const query = msg.tool_args?.query || 'Search results';
        const results = [];

        // 如果有citations，转换为结果格式
        if (toolResult.citations && Array.isArray(toolResult.citations)) {
          results.push(...toolResult.citations.map((url: string) => ({
            title: new URL(url).hostname,
            url: url,
            snippet: '',
            source: new URL(url).hostname
          })));
        }

        // 只显示搜索结果，不显示工具完成的文字
        parts = [
          {
            type: 'web_search',
            query,
            results,
            summary: toolResult.content || toolResult.summary
          }
        ];
      }
      // 其他工具使用通用ToolStatus显示
      else if (msg.role === 'tool' && msg.tool_name) {

        // 只显示工具结果，不显示工具完成的文字
        parts = [
          {
            type: 'tool_status',
            name: msg.tool_name,
            status: 'completed',
            displayResult: msg.content || 'Tool completed successfully',
            formattedData: toolResult
          }
        ];
      }
    }

    return {
      ...msg,
      parts
    };
  };

  // 初始化历史消息
  useEffect(() => {
    if (messagesData?.messages) {

      // 过滤掉工具开始状态的消息，只保留有结果的工具消息
      const filteredMessages = messagesData.messages.filter(msg => {
        // 保留用户和助手消息
        if (msg.role === 'user' || msg.role === 'assistant') {
          return true;
        }

        // 对于工具消息，只保留有tool_result的（完成状态）
        if (msg.role === 'tool') {
          const hasResult = msg.tool_result && msg.tool_result !== null;
          const isStartMessage = msg.content && msg.content.includes('🔧 Calling');

          // 跳过开始状态消息，保留完成状态消息
          if (isStartMessage && !hasResult) {
            return false;
          }

          if (hasResult) {
            return true;
          }
        }

        return false;
      });


      const convertedMessages = filteredMessages.map(convertMessage);
      setMessages(convertedMessages);
    }
  }, [messagesData?.messages]);

  // 滚动控制
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();

  // 发送消息
  const sendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() || isLoading) return;

    console.log('🎯 Sending message:', content);
    console.log('📎 Attachments:', attachments);
    setIsLoading(true);

    // 关闭之前的EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      console.log('📎 Attachments received:', attachments);

      // 检查是否有文件
      const hasFiles = attachments && attachments.length > 0;
      const files = hasFiles ? attachments.map(attachment => attachment.file).filter(Boolean) : [];

      console.log('📎 Has files:', hasFiles, 'File count:', files.length);

      let response: Response;

      // 读取localStorage中的财务数据作为session_state
      let sessionState = {};
      try {
        const storedData = localStorage.getItem('financial-data-storage');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          // 构建JSON格式的session_state
          if (parsedData.state?.financialData?.currentData) {
            sessionState = {
              "financial metrics data": parsedData.state.financialData.currentData
            };
          }

          // 添加available metrics到session_state
          if (financialData.availableMetrics && financialData.availableMetrics.length > 0) {
            sessionState = {
              ...sessionState,
              "available metrics": financialData.availableMetrics
            };
          }
        }
      } catch (e) {
        console.warn('Failed to read financial data from localStorage:', e);
      }

      if (hasFiles && files.length > 0) {
        // 有文件时使用FormData
        const formData = new FormData();
        formData.append('message', content);

        // 添加sessionState到FormData
        if (Object.keys(sessionState).length > 0) {
          formData.append('sessionState', JSON.stringify(sessionState));
        }

        files.forEach((file) => {
          if (file) {
            formData.append('files', file);
            console.log('📎 Adding file:', file.name, file.type, file.size);
          }
        });

        response = await fetch(`/api/chat/${chatId}/stream`, {
          method: 'POST',
          body: formData,
        });
      } else {
        // 没有文件时使用JSON
        console.log('📨 Sending text-only message');
        console.log('📊 Sending session_state:', sessionState);

        response = await fetch(`/api/chat/${chatId}/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionState: sessionState
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // 处理流式响应
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 处理完整的行
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.slice(6);
              const eventData = JSON.parse(jsonData);

              console.log('📡 Received event:', eventData.type);

              switch (eventData.type) {
                case 'user_saved':
                case 'assistant_start':
                case 'assistant_complete':
                  // 用户消息和助手消息直接处理
                  const convertedMessage = convertMessage(eventData.message);
                  setMessages(prev => {
                    const exists = prev.find(msg => msg.id === convertedMessage.id);
                    if (exists) {
                      // 更新现有消息
                      return prev.map(msg =>
                        msg.id === convertedMessage.id ? convertedMessage : msg
                      );
                    } else {
                      // 添加新消息
                      return [...prev, convertedMessage];
                    }
                  });
                  break;

                case 'tool_start':
                  // 跳过工具开始状态，不显示"Calling create_visualization..."
                  console.log('🔧 Tool started (not displaying):', eventData.message?.tool_name);
                  break;

                case 'tool_complete':
                  // 只显示工具完成结果
                  console.log('🔍 Tool complete event debug:', {
                    message: eventData.message,
                    tool_result: eventData.message?.tool_result
                  });

                  const completedToolMessage = convertMessage(eventData.message);
                  setMessages(prev => {
                    const exists = prev.find(msg => msg.id === completedToolMessage.id);
                    if (exists) {
                      // 更新现有消息
                      return prev.map(msg =>
                        msg.id === completedToolMessage.id ? completedToolMessage : msg
                      );
                    } else {
                      // 添加新消息
                      return [...prev, completedToolMessage];
                    }
                  });
                  break;

                case 'assistant_content':
                  // 更新assistant消息内容
                  setMessages(prev => prev.map(msg =>
                    msg.id === eventData.messageId
                      ? {
                          ...msg,
                          content: msg.content + eventData.content,
                          parts: [{ type: 'text', text: msg.content + eventData.content }]
                        }
                      : msg
                  ));
                  break;

                case 'conversation_complete':
                  console.log('✅ Conversation completed');
                  setIsLoading(false);
                  break;

                case 'error':
                  console.error('❌ Stream error:', eventData.error);
                  toast({
                    type: 'error',
                    description: eventData.error || 'Failed to send message',
                  });
                  setIsLoading(false);
                  break;
              }
            } catch (err) {
              console.warn('Failed to parse SSE data:', line, err);
            }
          }
        }
      }

    } catch (error) {
      console.error('Send message error:', error);
      toast({
        type: 'error',
        description: error.message || 'Failed to send message',
      });
      setIsLoading(false);
    }
  };

  // 清理
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const pathname = usePathname();
  const isNewChatLoading = pathname.includes('/chat/') && !pathname.includes('/permanent') && messages.length === 0 && isLoading;

  // 优化消息渲染以节省内存
  const MAX_VISIBLE_MESSAGES = 100;

  const { visibleMessages, hiddenCount } = useMemo(() => {
    if (messages.length <= MAX_VISIBLE_MESSAGES) {
      return { visibleMessages: messages, hiddenCount: 0 };
    }

    const hidden = messages.length - MAX_VISIBLE_MESSAGES;
    const visible = messages.slice(-MAX_VISIBLE_MESSAGES);

    return { visibleMessages: visible, hiddenCount: hidden };
  }, [messages]);

  // 显示加载状态
  if (isNewChatLoading) {
    return (
      <div className="flex flex-col h-full w-full max-w-full relative">
        <ChatHeader
          chatId={chatId}
          selectedModelId={initialChatModel}
          selectedVisibilityType="private"
          isReadonly={isReadonly}
          user={user}
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
      />

      <div className="flex-1 min-h-0 max-w-full">
        <div
          ref={containerRef}
          className="professional-messages-container flex flex-col min-w-0 max-w-full gap-6 h-full overflow-y-auto overflow-x-hidden pt-4 pb-32 px-4 md:px-6 custom-scrollbar relative"
        >
          {hiddenCount > 0 && (
            <div className="text-center text-sm text-muted-foreground py-2">
              {hiddenCount} older messages hidden
            </div>
          )}

          {visibleMessages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <Greeting user={user} />
            </div>
          )}

          {visibleMessages.map((message, index) => {
            const originalIndex = messages.indexOf(message);
            return (
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
                    isLoading={isLoading && messages.length - 1 === originalIndex}
                    isLatest={originalIndex === messages.length - 1}
                    vote={undefined}
                    setMessages={() => {}}
                    regenerate={() => {}}
                    isReadonly={isReadonly}
                  />
                </motion.div>
              </AnimatePresence>
            );
          })}

          <div ref={endRef} />
        </div>
      </div>

      {!isReadonly && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 md:pb-6 pt-4">
          <MultimodalInput
            status={isLoading ? 'streaming' : 'ready'}
            stop={() => setIsLoading(false)}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={[]}
            setMessages={() => {}}
            sendMessage={(message: string, messageAttachments?: Attachment[]) => {
              sendMessage(message, messageAttachments);
              // 发送后清空attachments
              setAttachments([]);
            }}
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