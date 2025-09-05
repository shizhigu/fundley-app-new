import { createMem0, addMemories, retrieveMemories } from '@mem0/vercel-ai-provider';

// Initialize Mem0 with minimal configuration - mem0 handles LLM internally
const mem0Config = {
  mem0ApiKey: process.env.MEM0_API_KEY || "",
  mem0Config: {
    // Global Mem0 settings
    enable_graph: false, // Enable graph memory if needed
  },
};

// Initialize Mem0 client
export const mem0 = createMem0(mem0Config);

// Helper function to get user ID from session
export function getUserIdFromSession(session: { user?: { id?: string } } | null): string {
  return session?.user?.id || 'anonymous';
}

// Add conversation memories using Vercel AI SDK format
export async function addConversationMemory(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  metadata?: Record<string, any>
) {
  try {
    const formattedMessages = messages.map(msg => {
      const role = msg.role as 'user' | 'assistant' | 'system';
      const content = [{ type: 'text' as const, text: msg.content }];
      
      // Return properly typed message based on role
      if (role === 'system') {
        return { role: 'system' as const, content: msg.content };
      } else if (role === 'user') {
        return { role: 'user' as const, content };
      } else {
        return { role: 'assistant' as const, content };
      }
    });

    await addMemories(formattedMessages as any, { 
      user_id: userId,
      mem0ApiKey: process.env.MEM0_API_KEY,
      ...metadata 
    });
  } catch (error) {
    console.error('Failed to add conversation memory:', error);
    // Don't throw - memory should be optional
  }
}

// Retrieve relevant memories for context
export async function getRelevantMemories(
  userQuery: string,
  userId: string
): Promise<string> {
  try {
    const memories = await retrieveMemories(userQuery, {
      user_id: userId,
      mem0ApiKey: process.env.MEM0_API_KEY,
    });
    
    return memories || '';
  } catch (error) {
    console.error('Failed to retrieve memories:', error);
    return ''; // Return empty string if memory retrieval fails
  }
}

// Enhanced model wrapper using mem0's memory-enabled model
export function getMemoryEnhancedModel(modelId: string, userId: string) {
  return mem0(modelId, { 
    user_id: userId,
  });
}

// Helper to check if Mem0 is properly configured
export function isMem0Configured(): boolean {
  return !!process.env.MEM0_API_KEY;
}