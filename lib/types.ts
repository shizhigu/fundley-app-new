import { z } from 'zod';
import type { ArtifactKind } from '@/lib/artifact-types';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Simplified ChatTools type without AI SDK dependencies
export type ChatTools = Record<string, any>;

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
};

// Message and attachment types
export interface Attachment {
  id?: string;
  name: string;
  contentType: string;
  size: number;
  url?: string;
  file?: File;
  data?: ArrayBuffer;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  parts: any[];
  timestamp: Date;
  createdAt?: Date;
  attachments?: Attachment[];
  invocation_id?: string;
  tool_name?: string;
  tool_result?: any;
  messageType?: string;
  toolData?: any;
}

// Tool execution types
export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  args: any;
  result?: any;
}

export interface ToolInvocation {
  id: string;
  toolCalls: ToolCall[];
  timestamp: Date;
}

// Message invocation grouping - our core invocation feature
export interface MessageInvocation {
  id: string;
  invocationId: string;
  userMessage: ChatMessage;
  toolMessages: ChatMessage[];
  assistantMessage?: ChatMessage;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

// Event streaming types
export interface StreamEvent {
  type: 'message' | 'tool_call' | 'tool_result' | 'error';
  data: any;
  timestamp: Date;
}

// Chart indicator types
export interface ChartIndicator {
  id: string;
  name: string;
  type: 'line' | 'histogram' | 'area';
  data: Array<{ time: string; value: number }>;
  color?: string;
  paneHeight?: number;
  metadata?: any;
}

// Utility types
export type { ArtifactKind, Suggestion };