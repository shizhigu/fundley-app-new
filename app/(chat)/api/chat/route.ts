import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { auth, type UserType } from '@/lib/auth/clerk';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import { convexQueries } from '@/lib/convex/client';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { createVisualization } from '@/lib/ai/tools/create-visualization';
import { financialFieldsAgent } from '@/lib/ai/agents/financial-fields-agent';
import { dataOrchestratorAgent } from '@/lib/ai/agents/data-orchestrator-agent';
import { getFinancialData } from '@/lib/ai/tools/financial/unified-financial-data';
import { 
  extractMDA, 
  extractRiskFactors, 
  extractBusinessOverview 
} from '@/lib/ai/tools/financial/sec-filings';
import {
  createCustomMetric,
  executeCustomMetric, 
  findCustomMetric
} from '@/lib/ai/tools/financial/custom-metrics';
import { 
  getRelevantMemories, 
  isMem0Configured 
} from '@/lib/ai/mem0';
import { isProductionEnvironment } from '@/lib/constants';
import { getLanguageModel, } from '@/lib/ai/providers';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import { getStreamContext } from '@/lib/ai/utils/stream-context';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ModelId } from '@/lib/ai/models';

export const maxDuration = 60;

// Stream context is now imported from utils

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log('📨 Chat API received:', JSON.stringify(json, null, 2));
    
    // Handle useChat format for permanent chat
    if (json.messages && Array.isArray(json.messages) && json.messages.length > 0) {
      // useChat format - convert to our expected format
      const lastMessage = json.messages[json.messages.length - 1];
      requestBody = {
        message: lastMessage,
        selectedChatModel: json.selectedChatModel || 'grok-3' // Use selected model or default
      };
      console.log('📨 Converted useChat format to:', JSON.stringify(requestBody, null, 2));
    } else {
      // Original format
      requestBody = postRequestBodySchema.parse(json);
    }
  } catch (error) {
    console.log('❌ Schema validation failed:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      message,
      selectedChatModel,
    }: {
      message: ChatMessage;
      selectedChatModel: ModelId;
    } = requestBody;

    // Get auth info and create authenticated Convex client
    const { getToken, userId } = await clerkAuth();
    const session = await auth();

    if (!session?.user || !userId) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;
    
    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    const token = await getToken({ template: 'convex' });
    if (token) {
      convex.setAuth(token);
    } else {
      console.warn('No Convex auth token available');
    }
    
    // Ensure user exists in Convex database
    await convex.mutation(api.users.store);

    // Skip rate limiting for now (we can add it back later if needed)

    // Get messages from user directly (no chat concept needed)
    const messagesFromDb = await convex.query(api.messages.list);
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];
    
    // Retrieve relevant memories for enhanced context (if configured)
    let memoryContext = '';
    if (isMem0Configured() && message.parts?.[0]?.type === 'text') {
      memoryContext = await getRelevantMemories(message.parts[0].text, userId);
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Save user message
    await convex.mutation(api.messages.create, {
      role: 'user',
      parts: message.parts,
      attachments: [],
      extractedMetadata: undefined, // User messages don't need metadata
    });
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Temporarily disable mem0 to test basic functionality
        const model = getLanguageModel(selectedChatModel);
          
        // Build system prompt with memory context
        const systemPromptText = systemPrompt({ requestHints });
        const enhancedSystemPrompt = memoryContext 
          ? `${systemPromptText}\n\n## Relevant Context from Previous Conversations:\n${memoryContext}`
          : systemPromptText;

        const result = streamText({
          model,
          system: enhancedSystemPrompt,
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          // 统一使用tools配置，不需要experimental_activeTools
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            createVisualization: createVisualization({ session, dataStream }),
            financialFieldsAgent,
            dataOrchestratorAgent,
            getFinancialData,
            extractMDA,
            extractRiskFactors,
            extractBusinessOverview,
            // 自定义指标工具
            createCustomMetric,
            executeCustomMetric,
            findCustomMetric,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Save assistant messages to database using authenticated client
        const messageIdMappings = new Map(); // Frontend UUID -> Convex ID
        
        for (const msg of messages) {
          if (msg.role === 'assistant') {
            const convexMessageId = await convex.mutation(api.messages.create, {
              role: msg.role,
              parts: msg.parts,
              attachments: [],
              extractedMetadata: undefined, // Will be extracted and updated later
            });
            
            // Store mapping for metadata extraction
            if (msg.id) {
              messageIdMappings.set(msg.id, convexMessageId);
            }
          }
        }
        
        // TODO: Pass messageIdMappings to metadata extraction if needed

        // Add conversation to memory if configured
        if (isMem0Configured() && messages.length > 0) {
          try {
            const conversationMessages = messages
              .filter(msg => msg.role === 'user' || msg.role === 'assistant')
              .map(msg => ({
                role: msg.role,
                content: msg.parts
                  ?.filter(part => part.type === 'text')
                  ?.map(part => part.text)
                  ?.join(' ') || ''
              }))
              .filter(msg => msg.content.trim());

            // Temporarily disabled mem0 integration
            // if (conversationMessages.length > 0) {
            //   await addConversationMemory(
            //     conversationMessages,
            //     userId,
            //     { timestamp: new Date().toISOString() }
            //   );
            // }
          } catch (error) {
            console.error('Failed to save conversation to memory:', error);
            // Don't fail the request if memory saving fails
          }
        }
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    // Return simple stream response
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    // Handle any other errors
    console.error('Unexpected error in chat API:', error);
    return new ChatSDKError('internal:chat').toResponse();
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Clear all messages for the user's permanent chat
  const deletedMessagesCount = await convexQueries.deleteAllMessagesForUser();

  return Response.json({ deletedMessagesCount }, { status: 200 });
}
