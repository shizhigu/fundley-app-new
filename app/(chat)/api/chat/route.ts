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

    // Get user's custom metrics for prompt enhancement
    let customMetrics: Array<{ id: string; name: string; description: string; }> = [];
    try {
      const result = await convex.query(api.metrics.search, {
        includeBuiltIn: false,
        includeCustom: true
      });
      customMetrics = result.metrics.map(metric => ({
        id: metric.id,
        name: metric.name,
        description: metric.description
      }));
      console.log(`📊 Loaded ${customMetrics.length} custom metrics for user`);
    } catch (error) {
      console.warn('Failed to load custom metrics for prompt:', error);
    }

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
          
        // Build system prompt with memory context and custom metrics
        const systemPromptText = systemPrompt({ requestHints, customMetrics });
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
            createDocument: createDocument({ session, dataStream, convex }),
            updateDocument: updateDocument({ session, dataStream, convex }),
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
              description: 'Calculate financial metrics using high-performance JSON AST engine with support for historical time series analysis',
              inputSchema: z.object({
                metricId: z.string().describe('ID or name of the metric to calculate'),
                symbols: z.array(z.string()).describe('Stock ticker symbols (e.g., ["AAPL", "MSFT"])'),
                periods: z.number().optional().default(4).describe('Number of historical periods to retrieve (1-12). Default 4 gets last 4 quarters'),
                periodType: z.enum(['quarter', 'annual']).optional().default('quarter').describe('Type of periods to analyze'),
                asOf: z.string().optional().describe('Latest time point for analysis. Format: "YYYY-QN" (e.g., "2024-Q3"). If omitted, uses most recent data'),
                includeHistorical: z.boolean().optional().default(false).describe('Whether to include historical data for trend analysis (calculates metric for multiple time points)')
              }),
              execute: async (params) => {
                try {
                  // Try to get metric by ID first, then by name search
                  let fullMetric;
                  
                  try {
                    // Try direct ID lookup first
                    fullMetric = await convex.query(api.metrics.getById, { 
                      metricId: params.metricId as any 
                    });
                  } catch (error) {
                    // If ID lookup fails, try name search
                    const searchResults = await convex.query(api.metrics.search, {
                      query: params.metricId,
                      includeCustom: true,
                      includeBuiltIn: true
                    });

                    const metric = searchResults.metrics.find(m => 
                      m.name.toLowerCase() === params.metricId.toLowerCase()
                    );

                    if (!metric) {
                      return `❌ Metric "${params.metricId}" not found. Use searchMetrics to find available metrics.`;
                    }
                    
                    // Get full metric details
                    fullMetric = await convex.query(api.metrics.getById, { 
                      metricId: metric.id as any 
                    });
                  }

                  // Record usage start time
                  const startTime = Date.now();
                  
                  try {
                    // Use high-performance AST engine
                    console.log('🧮 Executing AST calculation for metric:', fullMetric.name);
                    console.log('🔍 Full Metric Object:', JSON.stringify(fullMetric, null, 2));
                    console.log('🔍 AST Definition:', JSON.stringify(fullMetric.astDefinition, null, 2));
                    console.log('🔍 Include Historical:', params.includeHistorical, 'Periods:', params.periods);
                    
                    // Import and use AST engine directly to avoid URL resolution issues
                    const { FinancialASTEngine } = await import('@/app/api/calculate-metric-ast/route');
                    const astEngine = new FinancialASTEngine();
                    
                    if (!params.includeHistorical) {
                      // Simple case: single time point (current behavior)
                      calculationResults = await astEngine.calculateMetric({
                        name: fullMetric.name,
                        description: fullMetric.description,
                        formula_display: fullMetric.formula,
                        category: fullMetric.category,
                        ast: fullMetric.astDefinition,
                        data_requirements: fullMetric.dataRequirements || {}
                      }, params.symbols, params.asOf);
                    } else {
                      // Historical analysis: calculate for multiple time points
                      const periodsToCalculate = params.periods || 2;
                      const isQuarterly = params.periodType === 'quarter';
                      
                      // Generate time points (working backwards from asOf or latest)
                      const timePoints: string[] = [];
                      let baseYear = 2024;
                      let baseQuarter = 3; // Default to Q3 2024
                      
                      if (params.asOf) {
                        const parts = params.asOf.split('-');
                        baseYear = parseInt(parts[0]);
                        if (parts[1].startsWith('Q')) {
                          baseQuarter = parseInt(parts[1].substring(1));
                        }
                      }
                      
                      for (let i = 0; i < periodsToCalculate; i++) {
                        if (isQuarterly) {
                          let year = baseYear;
                          let quarter = baseQuarter - i;
                          
                          // Handle quarter underflow
                          while (quarter <= 0) {
                            quarter += 4;
                            year -= 1;
                          }
                          
                          timePoints.push(`${year}-Q${quarter}`);
                        } else {
                          timePoints.push(`${baseYear - i}-FY`);
                        }
                      }
                      
                      console.log('🕒 Historical time points:', timePoints);
                      
                      // Calculate for each time point using the SAME engine
                      const allResults: any[] = [];
                      for (const timePoint of timePoints) {
                        try {
                          const result = await astEngine.calculateMetric({
                            name: fullMetric.name,
                            description: fullMetric.description,
                            formula_display: fullMetric.formula,
                            category: fullMetric.category,
                            ast: fullMetric.astDefinition,
                            data_requirements: fullMetric.dataRequirements || {}
                          }, params.symbols, timePoint);
                          
                          allResults.push({
                            timePoint,
                            ...result
                          });
                        } catch (error) {
                          console.warn(`⚠️ Failed to calculate for ${timePoint}:`, error);
                          allResults.push({
                            timePoint,
                            error: error.message,
                            results: {}
                          });
                        }
                      }
                      
                      // Format as historical results but keep same engine identifier
                      calculationResults = {
                        metric_name: fullMetric.name,
                        historical_periods: allResults,
                        calculation_engine: 'Financial_AST_SQL_v1.0' // Same engine, just called multiple times
                      };
                    }
                    
                    const calculationResult = calculationResults;

                    console.log('🔍 Calculation Result:', JSON.stringify(calculationResult, null, 2));
                    const success = calculationResult.calculation_engine === 'Financial_AST_SQL_v1.0';
                    console.log('🔍 Success Check:', success, calculationResult.calculation_engine);

                    const executionTime = Date.now() - startTime;
                    
                    // Record usage statistics
                    await convex.mutation(api.metrics.recordUsage, {
                      metricId: fullMetric.id as any,
                      calculationTime: executionTime,
                      success: success
                    });

                    if (!success) {
                      return `❌ Calculation failed: ${calculationResult.error}`;
                    }

                    // Format results for LLM consumption
                    let formattedOutput = `📊 **${fullMetric.name} Calculation Results**\n\n`;
                    formattedOutput += `⚡ *High-Performance JSON AST Engine*\n`;
                    if (params.includeHistorical) {
                      formattedOutput += `📈 *Historical Analysis: ${params.periods} ${params.periodType}s*\n`;
                    }
                    if (params.asOf) {
                      formattedOutput += `🕒 *${params.includeHistorical ? 'Latest period' : 'As of'}: ${params.asOf}*\n`;
                    }
                    formattedOutput += `\n`;
                    
                    // Handle different result formats
                    if (calculationResult.historical_periods) {
                      // Historical analysis results - simple table
                      formattedOutput += `| Period | ${params.symbols.join(' | ')} |\n`;
                      formattedOutput += `|--------|${params.symbols.map(() => '--------').join('|')}|\n`;
                      
                      calculationResult.historical_periods.forEach((periodResult: any) => {
                        formattedOutput += `| ${periodResult.timePoint} |`;
                        params.symbols.forEach((symbol: string) => {
                          const symbolResult = periodResult.results?.[symbol];
                          if (symbolResult?.success && symbolResult.value !== null) {
                            const value = symbolResult.value;
                            if (typeof value === 'number') {
                              // Simple formatting: always show as decimal with 'x' suffix
                              formattedOutput += ` ${value.toFixed(2)}x |`;
                            } else {
                              formattedOutput += ` ${value} |`;
                            }
                          } else {
                            formattedOutput += ` N/A |`;
                          }
                        });
                        formattedOutput += `\n`;
                      });
                      
                    } else if (calculationResult.results) {
                      // Single point analysis results (original format)
                      Object.entries(calculationResult.results).forEach(([symbol, result]: [string, any]) => {
                        formattedOutput += `**${symbol}:**\n`;
                        if (result.success && result.value !== null) {
                          // Format the value appropriately
                          const value = result.value;
                          if (typeof value === 'number') {
                            // Format as percentage for ratios, or regular number for others
                            if (fullMetric.category === 'profitability' && value < 10) {
                              formattedOutput += `- ${fullMetric.name}: ${(value * 100).toFixed(2)}%\n`;
                            } else {
                              formattedOutput += `- ${fullMetric.name}: ${value.toFixed(4)}\n`;
                            }
                          }
                          formattedOutput += `- Formula: ${result.formula}\n`;
                        } else {
                          formattedOutput += `- Error: ${result.error || 'Calculation failed'}\n`;
                        }
                        formattedOutput += '\n';
                      });
                    } else {
                      formattedOutput += `Result: ${JSON.stringify(calculationResult, null, 2)}\n`;
                    }

                    formattedOutput += `\n⏱️ Execution Time: ${(executionTime/1000).toFixed(2)}s`;

                    return formattedOutput;
                  } catch (error) {
                    await convex.mutation(api.metrics.recordUsage, {
                      metricId: fullMetric.id as any,
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
              description: 'Create a new custom financial metric with JSON AST definition',
              inputSchema: z.object({
                name: z.string().describe('Display name of the metric'),
                description: z.string().describe('What this metric measures'),
                category: z.string().describe('Metric category (profitability, liquidity, efficiency, etc.)'),
                formula: z.string().describe('Human-readable formula description'),
                astDefinition: z.any().describe('JSON AST structure defining the calculation'),
                dataRequirements: z.object({
                  income_statement: z.array(z.string()).optional(),
                  balance_sheet: z.array(z.string()).optional(),
                  cash_flow_statement: z.array(z.string()).optional(),
                  periods_needed: z.array(z.string())
                }).describe('Data requirements specification'),
                isPublic: z.boolean().default(false).describe('Whether other users can see this metric')
              }),
              execute: async (params) => {
                try {
                  const metricId = await convex.mutation(api.metrics.create, {
                    name: params.name,
                    description: params.description,
                    category: params.category,
                    formula: params.formula,
                    astDefinition: params.astDefinition,
                    dataRequirements: params.dataRequirements,
                    isPublic: params.isPublic
                  });

                  return `✅ Custom metric "${params.name}" created successfully!\n\n📊 Metric Details:\n- ID: ${metricId}\n- Category: ${params.category}\n- Formula: ${params.formula}\n- ${params.isPublic ? 'Public' : 'Private'} metric\n- Engine: High-Performance JSON AST\n\n🎯 You can now use this metric with calculateMetric.\n\n🧮 AST Structure:\n\`\`\`json\n${JSON.stringify(params.astDefinition, null, 2).substring(0, 300)}${JSON.stringify(params.astDefinition, null, 2).length > 300 ? '...' : ''}\n\`\`\``;
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
