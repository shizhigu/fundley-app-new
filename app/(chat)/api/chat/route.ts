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
import { getFinancialData } from '@/lib/ai/tools/financial/unified-financial-data';
import { 
  extractMDA, 
  extractRiskFactors, 
  extractBusinessOverview 
} from '@/lib/ai/tools/financial/sec-filings';
// Removed old tool imports - using inline implementations with Convex access
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
import { z } from 'zod';

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
        selectedChatModel: json.selectedChatModel || 'grok-3', // Use selected model or default
        chatId: json.id // Pass chatId from useChat
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
      chatId: requestChatId,
    }: {
      message: ChatMessage;
      selectedChatModel: ModelId;
      chatId?: string;
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

    // Get or create specific chat - support dynamic chatId from useChat
    let chatId: string;
    if (requestChatId && requestChatId !== "main") {
      // Validate that the chatId exists and user has access
      const existingChat = await convex.query(api.chats.get, { id: requestChatId as any });
      if (existingChat) {
        chatId = requestChatId;
      } else {
        // Chat doesn't exist or no access, create default
        chatId = await convex.mutation(api.chats.getOrCreateDefault);
      }
    } else {
      // No specific chatId, use default
      chatId = await convex.mutation(api.chats.getOrCreateDefault);
    }
    
    // Get messages from specific chat - ensures complete isolation
    const messagesFromDb = await convex.query(api.messages.list, { chatId: chatId as any });
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

    // Save message to specific chat (could be user or assistant)
    if (message.role === 'user') {
      await convex.mutation(api.messages.create, {
        chatId: chatId as any,
        role: message.role,
        parts: message.parts,
        attachments: [],
        extractedMetadata: undefined, // User messages don't need metadata
      });
    }
    // Assistant messages with tool results should not be saved here as they're handled in onFinish
    const processedMessages = uiMessages;

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
          messages: convertToModelMessages(processedMessages),
          stopWhen: stepCountIs(5),
          // 统一使用tools配置，不需要experimental_activeTools
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            createVisualization: createVisualization({ session, dataStream }),
            // 财务数据工具
            getFinancialData,
            // SEC文件分析工具 
            extractMDA,
            extractRiskFactors,
            extractBusinessOverview,
            // 新的安全指标工具架构 - 内联实现以访问 Convex
            searchMetrics: {
              description: 'Search for available financial metrics (both built-in and custom)',
              inputSchema: z.object({
                query: z.string().optional().describe('Search keywords for metric name or description'),
                category: z.string().optional().describe('Filter by metric category (profitability, liquidity, efficiency, etc.)'),
                includeCustom: z.boolean().default(true).describe('Whether to include user-created custom metrics'),
                includeBuiltIn: z.boolean().default(true).describe('Whether to include built-in metrics')
              }),
              execute: async (params) => {
                try {
                  const results = await convex.query(api.metrics.search, {
                    query: params.query,
                    category: params.category,
                    includeCustom: params.includeCustom,
                    includeBuiltIn: params.includeBuiltIn
                  });

                  const { metrics, totalCount } = results;
                  
                  if (metrics.length === 0) {
                    return `🔍 No metrics found${params.query ? ` for "${params.query}"` : ''}${params.category ? ` in category "${params.category}"` : ''}.`;
                  }

                  const metricsList = metrics.map(m => 
                    `- **${m.name}** (${m.isBuiltIn ? 'Built-in' : 'Custom'}): ${m.description}`
                  ).join('\n');

                  return `🔍 Found ${totalCount} metric${totalCount > 1 ? 's' : ''}:\n\n${metricsList}\n\n💡 Use the metric ID or name with calculateMetric to compute values.`;
                } catch (error) {
                  return `❌ Error searching metrics: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
              }
            },
            calculateMetric: {
              description: 'Calculate financial metrics using Python code execution',
              inputSchema: z.object({
                metricId: z.string().describe('ID or name of the metric to calculate'),
                symbols: z.array(z.string()).describe('Stock ticker symbols (e.g., ["AAPL", "MSFT"])'),
                periods: z.number().optional().default(8).describe('Number of periods to retrieve'),
              }),
              execute: async (params) => {
                try {
                  // First, find the metric
                  const searchResults = await convex.query(api.metrics.search, {
                    query: params.metricId,
                    includeCustom: true,
                    includeBuiltIn: true
                  });

                  const metric = searchResults.metrics.find(m => 
                    m.id === params.metricId || 
                    m.name.toLowerCase() === params.metricId.toLowerCase()
                  );

                  if (!metric) {
                    return `❌ Metric "${params.metricId}" not found. Use searchMetrics to find available metrics.`;
                  }

                  // Record usage
                  const startTime = Date.now();
                  
                  try {
                    // Get the full metric details with Python code
                    const fullMetric = await convex.query(api.metrics.getById, { 
                      metricId: metric.id as any 
                    });

                    // Execute the Python calculation using our Python service
                    console.log('🐍 Executing Python code for metric:', fullMetric.name);
                    
                    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
                    const pythonResponse = await fetch(`${pythonServiceUrl}/execute-metric`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        python_code: fullMetric.pythonCode,
                        symbols: params.symbols,
                        metric_name: fullMetric.name,
                        timeout: fullMetric.executionConfig?.timeout || 30
                      }),
                    });

                    const executionTime = Date.now() - startTime;
                    let calculationResult;
                    let success = false;

                    if (pythonResponse.ok) {
                      calculationResult = await pythonResponse.json();
                      success = calculationResult.success;
                    } else {
                      calculationResult = {
                        success: false,
                        error: `Python service request failed: ${pythonResponse.status} ${pythonResponse.statusText}`
                      };
                    }
                    
                    await convex.mutation(api.metrics.recordUsage, {
                      metricId: metric.id as any,
                      calculationTime: executionTime,
                      success: success
                    });

                    if (!success) {
                      return `❌ Python execution failed: ${calculationResult.error}`;
                    }

                    // Format results for LLM consumption
                    let formattedOutput = `📊 **${fullMetric.name} Calculation Results**\n\n`;
                    
                    if (calculationResult.result && Array.isArray(calculationResult.result)) {
                      calculationResult.result.forEach(item => {
                        if (typeof item === 'object' && item.symbol) {
                          formattedOutput += `**${item.symbol}:**\n`;
                          
                          // Handle different result structures
                          Object.entries(item).forEach(([key, value]) => {
                            if (key !== 'symbol' && value !== null && value !== undefined) {
                              if (typeof value === 'number') {
                                formattedOutput += `  • ${key}: ${value.toFixed(4)}\n`;
                              } else {
                                formattedOutput += `  • ${key}: ${value}\n`;
                              }
                            }
                          });
                          formattedOutput += '\n';
                        }
                      });
                    } else {
                      formattedOutput += `Result: ${JSON.stringify(calculationResult.result, null, 2)}\n`;
                    }

                    if (calculationResult.logs) {
                      formattedOutput += `\n📋 **Execution Logs:**\n${calculationResult.logs}`;
                    }

                    formattedOutput += `\n\n⏱️ Execution Time: ${calculationResult.execution_time?.toFixed(2) || (executionTime/1000).toFixed(2)}s`;

                    return formattedOutput;
                  } catch (error) {
                    await convex.mutation(api.metrics.recordUsage, {
                      metricId: metric.id as any,
                      calculationTime: Date.now() - startTime,
                      success: false
                    });
                    throw error;
                  }
                } catch (error) {
                  return `❌ Error calculating metric: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
              }
            },
            createCustomMetric: {
              description: 'Create a new custom financial metric with Python code',
              inputSchema: z.object({
                name: z.string().describe('Display name of the metric'),
                description: z.string().describe('What this metric measures'),
                category: z.string().describe('Metric category (profitability, liquidity, efficiency, etc.)'),
                formula: z.string().describe('Human-readable formula description'),
                pythonCode: z.string().describe('Python function code that implements calculate_metric(symbols)'),
                timeout: z.number().optional().default(30).describe('Execution timeout in seconds'),
                isPublic: z.boolean().default(false).describe('Whether other users can see this metric')
              }),
              execute: async (params) => {
                try {
                  const metricId = await convex.mutation(api.metrics.create, {
                    name: params.name,
                    description: params.description,
                    category: params.category,
                    formula: params.formula,
                    pythonCode: params.pythonCode,
                    executionConfig: {
                      timeout: params.timeout,
                      allowedLibraries: ['pandas', 'numpy', 'math'],
                      description: 'Standard financial calculation environment'
                    },
                    isPublic: params.isPublic
                  });

                  return `✅ Custom metric "${params.name}" created successfully!\n\n📊 Metric Details:\n- ID: ${metricId}\n- Category: ${params.category}\n- Formula: ${params.formula}\n- Timeout: ${params.timeout}s\n- ${params.isPublic ? 'Public' : 'Private'} metric\n\n🎯 You can now use this metric with calculateMetric.\n\n🐍 Python code preview:\n\`\`\`python\n${params.pythonCode.substring(0, 200)}${params.pythonCode.length > 200 ? '...' : ''}\n\`\`\``;
                } catch (error) {
                  return `❌ Failed to create metric: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
              }
            },
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
              chatId: chatId as any, // Save to the same chat as user message
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
