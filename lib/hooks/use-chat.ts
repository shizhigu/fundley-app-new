'use client';

import { useState, useCallback, useEffect } from 'react';
import { useFinancialDataStore } from '@/lib/stores/financial-data-store';
import type {
  Chat,
  ChatMessage,
  ChatState,
  ChatActions,
  FinancialSessionState,
  StreamEvent
} from '@/lib/types/chat';

/**
 * 统一的聊天状态管理Hook
 * 整合所有聊天相关的状态和操作
 */
export function useChat(): ChatState & ChatActions {
  // ============ 核心状态 ============
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============ 财务数据集成 ============
  const financialData = useFinancialDataStore((state) => state.data);
  const availableMetrics = useFinancialDataStore((state) => state.availableMetrics);

  // 构建财务数据会话状态 - 不使用useCallback，确保每次都获取最新数据
  const buildSessionState = (): FinancialSessionState => {
    // 每次调用时重新获取最新的财务数据
    const currentFinancialData = useFinancialDataStore.getState().data;
    const currentAvailableMetrics = useFinancialDataStore.getState().availableMetrics;

    console.log('🔄 buildSessionState: Getting fresh data', {
      financialDataLength: currentFinancialData?.length || 0,
      availableMetricsLength: currentAvailableMetrics?.length || 0,
      timestamp: new Date().toISOString()
    });

    const sessionState: FinancialSessionState = {};

    if (currentFinancialData && currentFinancialData.length > 0) {
      sessionState['financial metrics data'] = currentFinancialData;
    }

    if (currentAvailableMetrics && currentAvailableMetrics.length > 0) {
      sessionState['available metrics'] = currentAvailableMetrics;
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
        body: JSON.stringify({ title: 'New Chat' })
      });

      if (!response.ok) throw new Error('Failed to create chat');

      const data = await response.json();
      await refreshChats(); // 刷新聊天列表
      return data.chatId;
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat');
      throw err;
    }
  }, [refreshChats]);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    setMessages([]); // 清空当前消息，等待加载
    loadMessages(chatId);
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete chat');

      // 如果删除的是当前聊天，切换到其他聊天
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }

      await refreshChats();
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError('Failed to delete chat');
    }
  }, [currentChatId, refreshChats]);

  // ============ 消息管理操作 ============

  const loadMessages = useCallback(async (chatId: string) => {
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

  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!currentChatId || !content.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      // 构建请求
      const sessionState = buildSessionState();
      console.log('📤 Sending message with sessionState:', {
        hasFinancialData: !!(sessionState['financial metrics data']?.length),
        financialDataLength: sessionState['financial metrics data']?.length || 0,
        hasAvailableMetrics: !!(sessionState['available metrics']?.length),
        availableMetricsLength: sessionState['available metrics']?.length || 0,
        sampleSymbols: sessionState['financial metrics data']?.slice(0, 3).map(d => d.symbol) || []
      });

      const hasFiles = files && files.length > 0;

      let response: Response;

      if (hasFiles) {
        // 文件上传使用FormData
        const formData = new FormData();
        formData.append('message', content);
        formData.append('sessionState', JSON.stringify(sessionState));
        files.forEach(file => formData.append('files', file));

        response = await fetch(`/api/chat/${currentChatId}/stream`, {
          method: 'POST',
          body: formData
        });
      } else {
        // 纯文本使用JSON
        response = await fetch(`/api/chat/${currentChatId}/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionState
          })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 处理流式响应
      await handleStreamResponse(response);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId]);

  // ============ 流式响应处理 ============

  const handleStreamResponse = useCallback(async (response: Response) => {
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
          handleStreamEvent(eventData);
        } catch (err) {
          console.warn('Failed to parse SSE data:', line, err);
        }
      }
    }
  }, []);

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case 'user_saved':
      case 'assistant_start':
      case 'assistant_complete':
      case 'tool_start':
      case 'tool_complete':
        if (event.message) {
          const convertedMessage = convertMessage(event.message);
          setMessages(prev => {
            const existing = prev.find(msg => msg.id === convertedMessage.id);
            if (existing) {
              return prev.map(msg =>
                msg.id === convertedMessage.id ? convertedMessage : msg
              );
            } else {
              return [...prev, convertedMessage];
            }
          });
        }
        break;

      case 'assistant_content':
        if (event.messageId && event.content) {
          setMessages(prev => prev.map(msg =>
            msg.id === event.messageId
              ? {
                  ...msg,
                  content: msg.content + event.content,
                  parts: [{ type: 'text', text: msg.content + event.content }]
                }
              : msg
          ));
        }
        break;

      case 'error':
        setError(event.error || 'Unknown error occurred');
        break;
    }
  }, []);

  // ============ 消息转换逻辑 ============

  const convertMessage = useCallback((msg: any): ChatMessage => {
    let parts = msg.parts || [{ type: 'text', text: msg.content || '' }];

    // 处理工具结果
    if (msg.role === 'tool' && msg.tool_result) {
      let toolResult;
      try {
        toolResult = typeof msg.tool_result === 'string'
          ? JSON.parse(msg.tool_result)
          : msg.tool_result;
      } catch (e) {
        toolResult = msg.tool_result;
      }

      // 前端可视化
      if (toolResult?.type === 'frontend_visualization' && toolResult.chartjsConfig) {
        parts = [{
          type: 'visualization',
          chartjsConfig: toolResult.chartjsConfig,
          title: toolResult.title || 'Chart',
          description: toolResult.description || 'Generated visualization'
        }];
      }
      // 网络搜索
      else if (msg.tool_name === 'web_search' && toolResult) {
        const query = msg.tool_args?.query || 'Search results';
        const results = toolResult.citations?.map((url: string) => ({
          title: new URL(url).hostname,
          url,
          snippet: '',
          source: new URL(url).hostname
        })) || [];

        parts = [{
          type: 'web_search',
          query,
          results,
          summary: toolResult.content || toolResult.summary
        }];
      }
      // 其他工具
      else if (msg.tool_name) {
        parts = [{
          type: 'tool_status',
          name: msg.tool_name,
          status: 'completed',
          displayResult: msg.content || 'Tool completed successfully',
          formattedData: toolResult
        }];
      }
    }

    return {
      ...msg,
      parts
    };
  }, []);

  // ============ 初始化 ============

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  // 自动选择默认聊天
  useEffect(() => {
    if (!currentChatId && chats.length > 0) {
      const latestChat = chats[0]; // chats已经按时间排序
      setCurrentChatId(latestChat.id);
      loadMessages(latestChat.id);
    }
  }, [currentChatId, chats, loadMessages]);

  // ============ 返回状态和操作 ============

  return {
    // 状态
    currentChatId,
    chats,
    messages,
    isLoading,
    error,

    // 操作
    createChat,
    selectChat,
    deleteChat,
    refreshChats,
    sendMessage,
    loadMessages,
    setLoading: setIsLoading,
    setError
  };
}