// Local AI SDK type definitions for AgentOS migration
// This file replaces external AI SDK dependencies with local types

import type { Attachment, ChatMessage } from '@/lib/types';

export type UIMessage = ChatMessage;

export interface UseChatHelpers<T = any> {
  status: 'loading' | 'awaiting_message' | 'in_progress' | 'streaming' | 'ready' | 'idle' | 'submitted' | 'error';
  setMessages: (messages: T[] | ((prevMessages: T[]) => T[])) => void;
  sendMessage: (content: string, attachments?: Attachment[]) => void;
  stop: () => void;
  regenerate: () => void;
  addToolResult?: (args: any) => void;
}

export type DataUIPart<T = any> = {
  type: string;
  data: T;
};

// Mock for useChat hook - not used in AgentOS migration
export function useChat() {
  throw new Error('useChat hook removed during AgentOS migration');
}

// Mock for streamText - not used in AgentOS migration
export function streamText() {
  throw new Error('streamText removed during AgentOS migration');
}

// Mock for generateText - not used in AgentOS migration
export function generateText() {
  throw new Error('generateText removed during AgentOS migration');
}