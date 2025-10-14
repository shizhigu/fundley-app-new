'use client';

import { useState, useCallback, useEffect } from 'react';
import { useFinancialDataStore } from '@/lib/stores/financial-data-store';
import type {
  Chat,
  ChatMessage,
  ChatState,
  ChatActions,
  FinancialSessionState,
  StreamEvent,
} from '@/lib/types/chat';
import type { MessageInvocation } from '@/lib/types';

/**
 * 统一的聊天状态管理Hook
 * 整合所有聊天相关的状态和操作
 */
export function useChat(): ChatState & ChatActions {
  // ============ 核心状态 ============
  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    // 从localStorage恢复最后选中的聊天ID
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSelectedChatId');
    }
    return null;
  });
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 跟踪活跃的stream，用于检测用户切换chat
  const [activeStreamChatId, setActiveStreamChatId] = useState<string | null>(
    null,
  );

  // ============ 财务数据集成 ============
  const financialData = useFinancialDataStore((state) => state.data);
  const availableMetrics = useFinancialDataStore(
    (state) => state.availableMetrics,
  );

  // 构建财务数据会话状态 - 不使用useCallback，确保每次都获取最新数据
  const buildSessionState = (): FinancialSessionState => {
    // 每次调用时重新获取最新的财务数据
    const currentFinancialData = useFinancialDataStore.getState().data;
    const currentAvailableMetrics =
      useFinancialDataStore.getState().availableMetrics;

    console.log('🔄 buildSessionState: Getting fresh data', {
      financialDataLength: currentFinancialData?.length || 0,
      availableMetricsLength: currentAvailableMetrics?.length || 0,
      timestamp: new Date().toISOString(),
    });

    const sessionState: FinancialSessionState = {};

    // 压缩财务数据：删除YoY/QoQ，限制数字精度为3位小数
    if (currentFinancialData && currentFinancialData.length > 0) {
      sessionState['financial_metrics_data'] = currentFinancialData.map(
        (dataPoint) => {
          const compressedMetrics: any = {};

          // 遍历每个指标
          Object.keys(dataPoint.metrics).forEach((metricKey) => {
            const metricData = dataPoint.metrics[metricKey];

            // 只保留value，删除qoq和yoy
            compressedMetrics[metricKey] = {
              value:
                typeof metricData.value === 'number'
                  ? parseFloat(metricData.value.toFixed(3)) // 保留3位小数
                  : metricData.value,
            };
          });

          return {
            symbol: dataPoint.symbol,
            fiscalYear: dataPoint.fiscalYear,
            period: dataPoint.period,
            date: dataPoint.date,
            metrics: compressedMetrics,
          };
        },
      );
    }

    if (currentAvailableMetrics && currentAvailableMetrics.length > 0) {
      sessionState['available_metrics'] = currentAvailableMetrics;
    }

    return sessionState;
  };

  // ============ 聊天管理操作 ============

  const refreshChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats');
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      setChats(data.chats || []);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
    }
  }, []);

  const createChat = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      if (!response.ok) throw new Error('Failed to create chat');

      const data = await response.json();
      await refreshChats(); // 刷新聊天列表
      return data.chat.id;
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat');
      throw err;
    }
  }, [refreshChats]);

  const selectChat = useCallback((chatId: string) => {
    // 验证 chatId 不为空
    if (!chatId || chatId === 'undefined') {
      console.warn('selectChat called with invalid chatId:', chatId);
      return;
    }

    setCurrentChatId(chatId);
    // 保存到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedChatId', chatId);
    }
    setMessages([]); // 清空当前消息，等待加载
    // loadMessages 会被 useEffect 自动触发，不需要在这里重复调用
  }, []);

  // 聊天选择的唯一逻辑 - 优先选择最新的聊天
  const selectFirstAvailableChat = useCallback(() => {
    if (chats.length > 0) {
      // 按更新时间倒序排序，选择最新的聊天
      const sortedChats = [...chats].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      const latestChat = sortedChats[0];
      setCurrentChatId(latestChat.id);
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastSelectedChatId', latestChat.id);
      }
      // 我们稍后会加载消息
    } else {
      setCurrentChatId(null);
      setMessages([]);
    }
  }, [chats]);

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete chat');

        // 先从本地状态移除
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));

        // 如果删除的是当前聊天，重新选择
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
          // 在下次渲染周期中自动选择
        }
      } catch (err) {
        console.error('Error deleting chat:', err);
        setError('Failed to delete chat');
      }
    },
    [currentChatId],
  );

  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) throw new Error('Failed to rename chat');

      const data = await response.json();

      // 更新本地状态
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, title: newTitle, updatedAt: data.chat.updatedAt }
            : chat,
        ),
      );
    } catch (err) {
      console.error('Error renaming chat:', err);
      setError('Failed to rename chat');
    }
  }, []);

  // ============ 消息管理操作 ============

  const loadMessages = useCallback(async (chatId: string) => {
    if (!chatId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      const convertedMessages = data.messages.map(convertMessage);
      setMessages(convertedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if (!currentChatId || !content.trim()) return;

      // 记录发送消息时的 chatId，用于验证流式响应
      const messageChatId = currentChatId;

      try {
        setIsLoading(true);
        setError(null);
        setActiveStreamChatId(messageChatId); // 标记活跃的stream

        // 删除前端检查逻辑，移到后端处理

        // 构建请求
        const sessionState = buildSessionState();
        console.log('📤 Sending message with sessionState:', {
          chatId: messageChatId,
          hasFinancialData: !!sessionState['financial_metrics_data']?.length,
          financialDataLength:
            sessionState['financial_metrics_data']?.length || 0,
          hasAvailableMetrics: !!sessionState['available_metrics']?.length,
          availableMetricsLength:
            sessionState['available_metrics']?.length || 0,
          sampleSymbols:
            sessionState['financial_metrics_data']
              ?.slice(0, 3)
              .map((d) => d.symbol) || [],
        });

        const hasFiles = files && files.length > 0;

        let response: Response;

        if (hasFiles) {
          // 文件上传使用FormData
          const formData = new FormData();
          formData.append('message', content);
          formData.append('sessionState', JSON.stringify(sessionState));
          files.forEach((file) => formData.append('files', file));

          response = await fetch(`/api/chat/${messageChatId}/stream`, {
            method: 'POST',
            body: formData,
          });
        } else {
          // 纯文本使用JSON
          response = await fetch(`/api/chat/${messageChatId}/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              sessionState,
            }),
          });
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 处理流式响应，传入 chatId 用于验证
        await handleStreamResponse(response, messageChatId);
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsLoading(false);
        setActiveStreamChatId(null); // 清除活跃stream标记
      }
    },
    [currentChatId],
  );

  // 删除前端直接调用Python服务的逻辑

  // ============ 流式响应处理 ============

  const handleStreamResponse = useCallback(
    async (response: Response, expectedChatId: string) => {
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;

          try {
            const jsonData = line.slice(6);
            if (jsonData === '[DONE]') break;

            const eventData: StreamEvent = JSON.parse(jsonData);
            handleStreamEvent(eventData, expectedChatId);
          } catch (err) {
            console.warn('Failed to parse SSE data:', line, err);
          }
        }
      }
    },
    [],
  );

  const handleStreamEvent = useCallback(
    (event: StreamEvent, expectedChatId: string) => {
      // 使用 activeStreamChatId 检测用户是否切换到其他chat
      // activeStreamChatId 在 sendMessage 开始时设置，结束时清除
      // 如果用户切换了chat，activeStreamChatId 会保持旧值，currentChatId 是新值

      // 简化逻辑：只要 activeStreamChatId 存在且与 expectedChatId 匹配，就接受事件
      // 如果 activeStreamChatId 为 null，说明没有活跃的stream，也接受（兼容刷新后重新加载）
      if (activeStreamChatId && activeStreamChatId !== expectedChatId) {
        console.warn('⚠️ Different stream is active, ignoring event:', {
          activeStreamChatId,
          expectedChatId,
          eventType: event.type,
        });
        return;
      }

      switch (event.type) {
        case 'user_saved':
        case 'tool_start':
        case 'tool_complete':
        case 'assistant_complete':
          // 这些事件：直接保存/更新完整消息
          if (event.message) {
            const convertedMessage = convertMessage(event.message);
            setMessages((prev) => {
              const existing = prev.find(
                (msg) => msg.id === convertedMessage.id,
              );
              if (existing) {
                return prev.map((msg) =>
                  msg.id === convertedMessage.id ? convertedMessage : msg,
                );
              } else {
                return [...prev, convertedMessage];
              }
            });
          }
          break;

        case 'assistant_start':
          // assistant_start：创建空消息占位，不显示初始内容
          if (event.message) {
            const convertedMessage = convertMessage(event.message);
            setMessages((prev) => {
              const existing = prev.find(
                (msg) => msg.id === convertedMessage.id,
              );
              if (!existing) {
                // 创建空消息占位符，内容为空字符串
                return [
                  ...prev,
                  {
                    ...convertedMessage,
                    content: '',
                    parts: [{ type: 'text', text: '' }],
                  },
                ];
              }
              return prev;
            });
          }
          break;

        case 'assistant_content':
          // assistant_content：增量追加内容
          if (event.messageId && event.content) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === event.messageId
                  ? {
                      ...msg,
                      content: (msg.content || '') + event.content,
                      parts: [
                        {
                          type: 'text',
                          text: (msg.content || '') + event.content,
                        },
                      ],
                    }
                  : msg,
              ),
            );
          }
          break;

        case 'error':
          setError(event.error || 'Unknown error occurred');
          break;
      }
    },
    [activeStreamChatId],
  );

  // ============ 消息分组逻辑 ============

  const groupMessagesByInvocation = useCallback(
    (messages: ChatMessage[]): MessageInvocation[] => {
      const invocations: Map<string, MessageInvocation> = new Map();
      const ungroupedMessages: ChatMessage[] = []; // 处理没有invocation_id的消息

      messages.forEach((msg) => {
        const invocationId = (msg as any).invocation_id;

        if (!invocationId) {
          // 兼容旧消息，没有invocation_id的消息
          ungroupedMessages.push(msg);
          return;
        }

        if (!invocations.has(invocationId)) {
          invocations.set(invocationId, {
            id: invocationId,
            invocationId,
            userMessage: null as any,
            assistantMessage: undefined,
            toolMessages: [],
            timestamp: new Date(),
            status: 'pending',
          });
        }

        const invocation = invocations.get(invocationId)!;

        if (msg.role === 'user') {
          invocation.userMessage = msg;
          invocation.timestamp = new Date(msg.timestamp || Date.now());
        } else if (msg.role === 'assistant') {
          invocation.assistantMessage = msg;
        } else if (msg.role === 'tool') {
          invocation.toolMessages.push(msg);
        }
      });

      // 转换为数组并按时间排序
      const groupedInvocations = Array.from(invocations.values())
        .filter((inv) => inv.userMessage) // 确保有用户消息
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // 为兼容旧消息，将没有invocation_id的消息也转换为"伪invocation"
      const ungroupedInvocations = ungroupedMessages
        .map((msg) => ({
          id: `single-${msg.id}`,
          invocationId: `single-${msg.id}`, // 给每个单独消息一个唯一ID
          userMessage: msg.role === 'user' ? msg : (null as any),
          assistantMessage: msg.role === 'assistant' ? msg : undefined,
          toolMessages: msg.role === 'tool' ? [msg] : [],
          timestamp: new Date(msg.timestamp || Date.now()),
          status: 'completed' as const,
        }))
        .filter(
          (inv) =>
            inv.userMessage ||
            inv.assistantMessage ||
            inv.toolMessages.length > 0,
        );

      // 合并分组消息和单独消息，按时间排序
      const allInvocations = [
        ...groupedInvocations,
        ...ungroupedInvocations,
      ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return allInvocations;
    },
    [],
  );

  // ============ 消息转换逻辑 ============

  const convertMessage = useCallback((msg: any): ChatMessage => {
    let parts = msg.parts || [{ type: 'text', text: msg.content || '' }];

    // 处理工具结果
    if (msg.role === 'tool' && msg.tool_result) {
      let toolResult;
      try {
        toolResult =
          typeof msg.tool_result === 'string'
            ? JSON.parse(msg.tool_result)
            : msg.tool_result;
      } catch (e) {
        toolResult = msg.tool_result;
      }

      // 前端可视化
      if (
        toolResult?.type === 'frontend_visualization' &&
        toolResult.chartjsConfig
      ) {
        parts = [
          {
            type: 'visualization',
            chartjsConfig: toolResult.chartjsConfig,
            title: toolResult.title || 'Chart',
            description: toolResult.description || 'Generated visualization',
          },
        ];
      }
      // 网络搜索
      else if (msg.tool_name === 'web_search' && toolResult) {
        const query = msg.tool_args?.query || 'Search results';
        const results =
          toolResult.citations?.map((url: string) => ({
            title: new URL(url).hostname,
            url,
            snippet: '',
            source: new URL(url).hostname,
          })) || [];

        parts = [
          {
            type: 'web_search',
            query,
            results,
            summary: toolResult.content || toolResult.summary,
          },
        ];
      }
      // 其他工具
      else if (msg.tool_name) {
        parts = [
          {
            type: 'tool_status',
            name: msg.tool_name,
            status: 'completed',
            displayResult: msg.content || 'Tool completed successfully',
            formattedData: toolResult,
          },
        ];
      }
    }

    return {
      ...msg,
      parts,
    };
  }, []);

  // ============ 初始化 ============

  // 组件挂载时初始化
  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  // 删除自动创建聊天的逻辑

  // 当聊天ID改变时，加载对应的消息
  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    }
  }, [currentChatId, loadMessages]);

  // 简化的聊天选择逻辑 - 不自动创建聊天
  useEffect(() => {
    // 如果从localStorage恢复的聊天ID存在于聊天列表中，就使用它
    if (currentChatId && chats.find((chat) => chat.id === currentChatId)) {
      // 当前聊天ID有效，不需要改变
      return;
    }

    if (!currentChatId && chats.length > 0) {
      // 没有选中聊天但有可用聊天，选择最新的
      selectFirstAvailableChat();
    } else if (
      currentChatId &&
      !chats.find((chat) => chat.id === currentChatId)
    ) {
      // 当前聊天不存在了（可能被删除），重新选择
      if (chats.length > 0) {
        selectFirstAvailableChat();
      } else {
        // 没有聊天了，清空选择
        setCurrentChatId(null);
        setMessages([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lastSelectedChatId');
        }
      }
    }
    // 如果没有聊天，就什么都不做，让用户手动创建
  }, [currentChatId, chats, selectFirstAvailableChat]);

  // ============ 计算分组消息 ============
  const groupedMessages = groupMessagesByInvocation(messages);

  // ============ 返回状态和操作 ============

  return {
    // 状态
    currentChatId,
    chats,
    messages,
    groupedMessages, // 新增分组消息
    isLoading,
    error,

    // 操作
    createChat,
    selectChat,
    deleteChat,
    renameChat,
    refreshChats,
    sendMessage,
    loadMessages,
    selectFirstAvailableChat,
    setLoading: setIsLoading,
    setError,
  };
}
