/**
 * 聊天系统的统一类型定义
 * 整合所有聊天相关的接口，确保类型安全
 */

import type { AuthSession } from '@/lib/auth/clerk';

// ============ 基础聊天类型 ============

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  parts: any[];
  timestamp: Date;
  createdAt?: Date;
  attachments?: any[];
  invocation_id?: string;
  tool_name?: string;
  tool_result?: any;
  messageType?: string;
  toolData?: any;
}

export interface MessagePart {
  type: 'text' | 'visualization' | 'tool_status' | 'web_search';
  text?: string;

  // 可视化类型
  chartjsConfig?: any;
  title?: string;
  description?: string;

  // 工具状态类型
  name?: string;
  status?: 'started' | 'completed' | 'failed';
  displayResult?: string;
  formattedData?: any;

  // 网络搜索类型
  query?: string;
  results?: SearchResult[];
  summary?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// ============ 聊天状态管理 ============

export interface ChatState {
  currentChatId: string | null;
  chats: Chat[];
  messages: ChatMessage[];
  groupedMessages: import('@/lib/types').MessageInvocation[]; // Add grouped messages
  isLoading: boolean;
  error: string | null;
  blockToolCalled: number; // Block 工具调用计数器，用于触发轮询
}

export interface ChatActions {
  // 聊天管理
  createChat: () => Promise<string>;
  selectChat: (chatId: string) => void;
  selectFirstAvailableChat: () => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => Promise<void>;
  refreshChats: () => void;

  // 消息管理
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  loadMessages: (chatId: string) => void;

  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ============ 财务数据会话状态 ============

import type {
  FinancialDataPoint,
  AvailableMetric,
} from '@/lib/types/financial-data';

export interface FinancialSessionState {
  financial_metrics_data?: FinancialDataPoint[];
  available_metrics?: AvailableMetric[];
}

// ============ 组件Props类型 ============

export interface ChatLayoutProps {
  user: AuthSession['user'];
}

export interface ChatManagerProps {
  user: AuthSession['user'];
}

export interface ChatInterfaceProps {
  chatId: string;
  user: AuthSession['user'];
  isReadonly?: boolean;
}

// ============ API相关类型 ============

export interface SendMessageRequest {
  message: string;
  sessionState?: FinancialSessionState;
}

export interface ChatAPIResponse {
  chats: Chat[];
}

export interface MessagesAPIResponse {
  messages: ChatMessage[];
}

export interface CreateChatResponse {
  chatId: string;
}

// ============ 事件类型 ============

export interface StreamEvent {
  type:
    | 'user_saved'
    | 'assistant_start'
    | 'assistant_content'
    | 'assistant_complete'
    | 'tool_start'
    | 'tool_complete'
    | 'conversation_complete'
    | 'error';
  message?: ChatMessage;
  messageId?: string;
  content?: string;
  error?: string;
}
