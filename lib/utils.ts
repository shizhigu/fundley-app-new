// Mock types to replace AI SDK imports
type CoreAssistantMessage = { role: 'assistant', content: string };
type CoreToolMessage = { role: 'tool', content: string };
type UIMessage = { role: string, content?: string };
type UIMessagePart = any;
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Message } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';
import { formatISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  console.log('📡 Fetcher called with URL:', url);
  const response = await fetch(url);

  if (!response.ok) {
    console.log('❌ Fetch failed:', response.status, response.statusText);
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  const data = await response.json();
  console.log('✅ Fetch successful:', data);
  return data;
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(
  messages: Message[], 
  vizCacheMap?: Map<string, any>
): ChatMessage[] {
  return messages.map((message, index) => {
    // Handle both Convex format (_id) and regular format (id)
    const messageId = message._id || message.id || `temp-${index}`;
    
    try {
      
      // Get the parts
      let parts = message.parts as any[];
    
    // Inject cached data for createVisualization tool outputs
    if (vizCacheMap?.has(messageId)) {
      const cache = vizCacheMap.get(messageId);
      
      parts = parts.map(part => {
        if (part.type === 'tool-createVisualization' && 
            part.state === 'output-available' && 
            part.output) {
          // Inject cached HTML and image into the output
          return {
            ...part,
            output: {
              ...part.output,
              cachedHtml: cache.htmlContent || undefined,
              cachedImage: cache.imageUrl || undefined,
            }
          };
        }
        return part;
      });
    }
    
    const convertedMessage = {
      id: messageId,
      role: message.role as 'user' | 'assistant' | 'system',
      parts,
      timestamp: new Date(message.createdAt || (message as any)._createdTime || Date.now()),
      extractedMetadata: message.extractedMetadata, // Include cached metadata
      _id: message._id, // Preserve Convex ID for metadata API
      metadata: {
        createdAt: formatISO(message.createdAt || new Date((message as any)._createdTime || Date.now())),
      },
    };
    
    // Debug log for metadata
    // if (message.role === 'assistant' && message.extractedMetadata) {
    //   console.log('🎯 ConvertToUIMessages: Found cached metadata for message', messageId, message.extractedMetadata);
    // }
    
    return convertedMessage;
    } catch (error) {
      console.error(`❌ Error converting message ${index} (${messageId}):`, error);
      console.error(`❌ Message data:`, message);
      // Return a fallback message to prevent complete failure
      return {
        id: messageId,
        role: message.role,
        parts: [{ type: 'text', text: '[Error loading message]' }],
        timestamp: new Date(message.createdAt || Date.now()),
        createdAt: new Date(message.createdAt || Date.now()),
      };
    }
  });
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

// ============ Block History Management ============
// Note: Block history is now managed by Redis (backend)
// Use /api/user/active-block API instead of localStorage
