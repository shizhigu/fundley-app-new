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
import { createJSVisualization } from '@/lib/ai/tools/create-js-visualization';
import { getFinancialData } from '@/lib/ai/tools/financial/unified-financial-data';
import { 
  extractMDA, 
  extractRiskFactors, 
  extractBusinessOverview 
} from '@/lib/ai/tools/financial/sec-filings';
import { webSearch } from '@/lib/ai/tools/search/perplexity-search';
import { scanMarket, scanTopCompanies } from '@/lib/ai/tools/financial/market-scanner';
// 全新的LaTeX财务指标工具
import {
  createLatexMetric,
  calculateLatexMetric,
  searchLatexMetrics,
  getPopularLatexMetrics
} from '@/lib/ai/tools/financial/latex-tools';
// 图表指标工具
import { addChartIndicator } from '@/lib/ai/tools/chart/add-chart-indicator';
import { addFundamentalData } from '@/lib/ai/tools/chart/add-fundamental-data';
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
import type { ModelId } from '@/lib/ai/models';
import { z } from 'zod';

export const runtime = 'nodejs';
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
        chatId: json.id, // Pass chatId from useChat
        currentFinancialData: json.currentFinancialData // Pass financial data from useChat
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
      currentFinancialData,
    }: {
      message: PostRequestBody['message'];
      selectedChatModel: ModelId;
      chatId?: string;
      currentFinancialData?: PostRequestBody['currentFinancialData'];
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

    // Get user's accessible LaTeX metrics for prompt enhancement  
    let customMetrics: Array<{ id: string; name: string; description: string; }> = [];
    try {
      const latexMetrics = await convex.query(api.latexMetrics.getAccessibleLatexMetrics, {
        limit: 20
      });
      customMetrics = latexMetrics.map(metric => ({
        id: metric._id,
        name: metric.name,
        description: metric.description
      }));
      console.log(`📊 Loaded ${customMetrics.length} LaTeX metrics for user:`, 
        customMetrics.map(m => ({ id: m.id, name: m.name })));
    } catch (error) {
      console.warn('Failed to load LaTeX metrics for prompt:', error);
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
          
        // Build system prompt with memory context, custom metrics, and financial data
        const systemPromptText = systemPrompt({ requestHints, customMetrics });

        // Add financial data context if available
        console.log('📊 API Route: Checking financial data');
        console.log('📊 currentFinancialData:', currentFinancialData);
        console.log('📊 isActive:', currentFinancialData?.isActive);
        console.log('📊 data length:', currentFinancialData?.currentData?.length);

        let financialDataContext = '';
        if (currentFinancialData?.isActive && currentFinancialData.currentData.length > 0) {
          console.log('✅ API Route: Adding financial data to system prompt');
          financialDataContext = `\n\n## Current Financial Data Context\n\n用户当前正在查看以下财务数据（右侧面板数据）：\n\n\`\`\`json\n${JSON.stringify(currentFinancialData.currentData, null, 2)}\`\`\`\n\n**重要分析指导**：\n- 请基于上述具体数据进行分析和回答\n- 引用具体的数值、时期和趋势\n- 比较不同公司或时期的表现\n- 解释数据背后的含义和影响\n- 数据最后更新时间：${currentFinancialData.lastUpdated}`;
        } else {
          console.log('❌ API Route: No financial data to include in system prompt');
        }

        const enhancedSystemPrompt = [
          systemPromptText,
          memoryContext ? `\n\n## Relevant Context from Previous Conversations:\n${memoryContext}` : '',
          financialDataContext
        ].filter(Boolean).join('');
        
        // 🐛 DEBUG: Print complete system prompt for debugging
        console.log('🤖 COMPLETE SYSTEM PROMPT:', enhancedSystemPrompt);

        const result = streamText({
          model,
          system: enhancedSystemPrompt,
          messages: convertToModelMessages(processedMessages as any),
          stopWhen: stepCountIs(5),
          // 统一使用tools配置，不需要experimental_activeTools
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            createJSVisualization: createJSVisualization({ session, dataStream }),
            // 财务数据工具
            getFinancialData,
            // SEC文件分析工具 
            extractMDA,
            extractRiskFactors,
            extractBusinessOverview,
            // 网络搜索工具
            webSearch,
            // 市场扫描工具 - 新增全市场分析功能
            // scanMarket,
            // scanTopCompanies,
            // 旧的AST指标工具 - 已注释，现在使用LaTeX系统
            /* searchMetrics: {
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
            }, */
            /* calculateMetric: {
              description: 'Calculate financial metrics using high-performance JSON AST engine. Supports both single and multiple metrics calculation.',
              inputSchema: z.object({
                metricId: z.string().optional().describe('Single metric ID or name (legacy support)'),
                metricIds: z.array(z.string()).optional().describe('Multiple metric IDs or names for batch calculation'),
                symbols: z.array(z.string()).describe('Stock ticker symbols (e.g., ["AAPL", "MSFT"])'),
                periods: z.number().optional().default(4).describe('Number of historical periods to retrieve (1-25). Default 4 gets last 4 quarters'),
                periodType: z.enum(['quarter', 'annual']).optional().default('quarter').describe('Type of periods to analyze'),
                asOf: z.string().optional().describe('Latest time point for analysis. Format: "YYYY-QN" (e.g., "2025-Q3"). If omitted, uses most recent data'),
              }).refine(
                (data) => data.metricId || data.metricIds,
                "Either metricId or metricIds must be provided"
              ),
              execute: async (params) => {
                try {
                  // 1. 规范化输入参数 - 支持单指标和多指标
                  const metricIds = params.metricIds || (params.metricId ? [params.metricId] : []);
                  
                  if (metricIds.length === 0) {
                    return '❌ No metric IDs provided. Please specify either metricId or metricIds.';
                  }
                  
                  console.log(`🔍 Calculating ${metricIds.length} metric(s) for ${params.symbols.length} symbol(s)`);
                  console.log(`📊 Metrics: [${metricIds.join(', ')}]`);
                  console.log(`🎯 Symbols: [${params.symbols.join(', ')}]`);
                  
                  // 2. 获取所有指标的定义
                  const fullMetrics = [];
                  const failedMetrics = [];
                  
                  for (const metricId of metricIds) {
                    try {
                      let fullMetric;
                      
                      // Check if the input looks like a Convex ID (contains only alphanumeric characters and is the right length)
                      const isConvexId = /^[a-z0-9]{32}$/.test(metricId);
                      
                      if (isConvexId) {
                        try {
                          // Direct ID lookup
                          fullMetric = await convex.query(api.metrics.getById, { 
                            metricId: metricId as any 
                          });
                        } catch (error) {
                          throw new Error(`Metric with ID "${metricId}" not found.`);
                        }
                      } else {
                        // Search by name
                        const searchResults = await convex.query(api.metrics.search, {
                          query: metricId,
                          includeCustom: true,
                          includeBuiltIn: true
                        });

                        const metric = searchResults.metrics.find(m => 
                          m.name.toLowerCase() === metricId.toLowerCase()
                        );

                        if (!metric) {
                          throw new Error(`Metric "${metricId}" not found. Use searchMetrics to find available metrics.`);
                        }
                        
                        // Get full metric details
                        fullMetric = await convex.query(api.metrics.getById, { 
                          metricId: metric.id as any 
                        });
                      }

                      if (!fullMetric) {
                        throw new Error(`Failed to retrieve metric definition for "${metricId}"`);
                      }

                      fullMetrics.push(fullMetric);
                      console.log(`✅ Retrieved metric definition for "${metricId}": ${fullMetric.name}`);
                      
                    } catch (error) {
                      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                      console.error(`❌ Failed to retrieve metric "${metricId}": ${errorMsg}`);
                      failedMetrics.push({ id: metricId, error: errorMsg });
                    }
                  }

                  // 检查是否有任何指标成功获取
                  if (fullMetrics.length === 0) {
                    const errorSummary = failedMetrics.map(f => `- ${f.id}: ${f.error}`).join('\n');
                    return `❌ Failed to retrieve any metrics:\n${errorSummary}`;
                  }

                  // 如果有失败的指标，记录但继续处理成功的指标
                  if (failedMetrics.length > 0) {
                    const failedIds = failedMetrics.map(f => f.id).join(', ');
                    console.warn(`⚠️ Some metrics failed to load: [${failedIds}]. Continuing with successful metrics.`);
                  }

                  // 3. 处理多symbol或多指标情况 - 最土的办法：多次调用单symbol逻辑
                  if (params.symbols.length > 1 || fullMetrics.length > 1) {
                    const allResults = [];
                    
                    // 最土的办法：每个symbol分别算
                    for (const symbol of params.symbols) {
                      for (const metric of fullMetrics) {
                        try {
                          // 调用增强引擎处理单symbol单指标
                          const { SimplifiedFinancialEngine } = await import('@/lib/financial/simplified-engine');
                          const engine = new SimplifiedFinancialEngine();
                          
                          let parsedAstDefinition = metric.astDefinition;
                          if (typeof metric.astDefinition === 'string') {
                            parsedAstDefinition = JSON.parse(metric.astDefinition);
                          }
                          
                          const result = await engine.calculateMetric({
                            metricDefinition: {
                              name: metric.name,
                              description: metric.description,
                              formula_display: metric.formula,
                              category: metric.category,
                              ast: parsedAstDefinition,
                              data_requirements: metric.dataRequirements || undefined
                            },
                            symbols: [symbol], // 单symbol
                            periods: params.periods,
                            periodType: params.periodType,
                            asOf: params.asOf
                          });
                          
                          allResults.push({
                            symbol: symbol,
                            metric: metric.name,
                            success: true,
                            data: result
                          });
                          
                        } catch (error) {
                          allResults.push({
                            symbol: symbol,
                            metric: metric.name,
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                          });
                        }
                      }
                    }
                    
                    // 简单拼接结果
                    let resultText = `Multi-symbol calculation completed:\n`;
                    for (const result of allResults) {
                      if (result.success) {
                        resultText += `✅ ${result.symbol} ${result.metric}: Success\n`;
                      } else {
                        resultText += `❌ ${result.symbol} ${result.metric}: ${result.error}\n`;
                      }
                    }
                    
                    return {
                      success: true,
                      message: resultText,
                      results: allResults
                    };
                  }
                  
                  // 4. 单指标：使用完全原有的逻辑
                  const fullMetric = fullMetrics[0];
                  
                  // Record usage start time
                  const startTime = Date.now();
                  
                  try {
                    // Use enhanced AST engine with DuckDB and market scanning
                    console.log('🧮 Executing enhanced AST calculation for metric:', fullMetric.name);
                    console.log('🔍 Full Metric Object:', JSON.stringify(fullMetric, null, 2));
                    
                    // Parse astDefinition if it's a string (common issue with Convex storage)
                    let parsedAstDefinition = fullMetric.astDefinition;
                    if (typeof fullMetric.astDefinition === 'string') {
                      console.log('🔧 AST Definition is string, parsing...');
                      try {
                        parsedAstDefinition = JSON.parse(fullMetric.astDefinition);
                        console.log('✅ Successfully parsed AST from string');
                      } catch (parseError) {
                        console.error('❌ Failed to parse AST string:', parseError);
                        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                        return `❌ Invalid AST definition stored in database: ${errorMessage}`;
                      }
                    }
                    
                    console.log('🔍 Parsed AST Definition:', JSON.stringify(parsedAstDefinition, null, 2));
                    console.log('🔍 Periods:', params.periods, 'Period Type:', params.periodType);
                    
                    // Import and use AST engine with DuckDB
                    console.log('⚡ About to import SimplifiedFinancialEngine...');
                    const { SimplifiedFinancialEngine } = await import('@/lib/financial/simplified-engine');
                    console.log('✅ SimplifiedFinancialEngine imported successfully');
                    
                    console.log('⚡ About to create new SimplifiedFinancialEngine instance...');
                    const astEngine = new SimplifiedFinancialEngine();
                    console.log('✅ SimplifiedFinancialEngine instance created successfully');
                    
                    let calculationResult;
                    
                    // Always use the unified calculation approach
                    console.log('⚡ About to call astEngine.calculateMetric...');
                    console.log('🔍 Parameters for calculateMetric:', {
                      metricName: fullMetric.name,
                      symbols: params.symbols,
                      options: {
                        periods: params.periods,
                        periodType: params.periodType,
                        asOf: params.asOf
                      }
                    });
                    
                    try {
                      calculationResult = await astEngine.calculateMetric({
                        metricDefinition: {
                          name: fullMetric.name,
                          description: fullMetric.description,
                          formula_display: fullMetric.formula,
                          category: fullMetric.category,
                          ast: parsedAstDefinition,  // Use parsed AST definition
                          data_requirements: fullMetric.dataRequirements || undefined
                        },
                        symbols: params.symbols,
                        periods: params.periods,
                        periodType: params.periodType,
                        asOf: params.asOf
                      });
                      
                      console.log('✅ astEngine.calculateMetric completed successfully');
                      console.log('📊 Calculation result:', JSON.stringify(calculationResult, null, 2));
                    } catch (calcError) {
                      console.error('❌ astEngine.calculateMetric failed:', calcError);
                      throw calcError;
                    }

                    console.log('🔍 Calculation Result:', JSON.stringify(calculationResult, null, 2));
                    
                    // 检查SimplifiedFinancialEngine返回的格式: { metric, symbols, metadata }
                    const success = calculationResult && 
                                   calculationResult.symbols && 
                                   Array.isArray(calculationResult.symbols) &&
                                   calculationResult.symbols.length > 0 &&
                                   calculationResult.symbols.some((symbolData: any) => 
                                     symbolData.values && symbolData.values.length > 0
                                   );
                                   
                    console.log('🔍 Success Check Details:');
                    console.log(`  - calculationResult exists: ${!!calculationResult}`);
                    console.log(`  - symbols array exists: ${!!(calculationResult?.symbols)}`);
                    console.log(`  - symbols count: ${calculationResult?.symbols?.length || 0}`);
                    console.log(`  - metric name: ${calculationResult?.metric || 'undefined'}`);
                    console.log('🔍 Final Success Check:', success);

                    const executionTime = Date.now() - startTime;
                    
                    // Record usage statistics
                    await convex.mutation(api.metrics.recordUsage, {
                      metricId: fullMetric.id as any,
                      calculationTime: executionTime,
                      success: success
                    });

                    if (!success) {
                      return `❌ Calculation failed: No results were generated for any symbols`;
                    }

                    // Format results for LLM consumption
                    let formattedOutput = `📊 **${fullMetric.name} Calculation Results**\n\n`;
                    formattedOutput += `⚡ *High-Performance JSON AST Engine*\n`;
                    if (params.periods && params.periods > 1) {
                      formattedOutput += `📈 *Historical Analysis: ${params.periods} ${params.periodType}s*\n`;
                    }
                    if (params.asOf) {
                      formattedOutput += `🕒 *As of: ${params.asOf}*\n`;
                    }
                    formattedOutput += `\n`;
                    
                    // Handle different result formats
                    if ('historical_periods' in calculationResult && Array.isArray(calculationResult.historical_periods)) {
                      // Historical analysis results - simple table
                      formattedOutput += `| Period | ${params.symbols.join(' | ')} |\n`;
                      formattedOutput += `|--------|${params.symbols.map(() => '--------').join('|')}|\n`;
                      
                      (calculationResult as any).historical_periods.forEach((periodResult: any) => {
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
                      
                    } else if ('results' in calculationResult && calculationResult.results) {
                      // SimplifiedFinancialEngine format with periods array
                      Object.entries(calculationResult.results).forEach(([symbol, result]: [string, any]) => {
                        formattedOutput += `**${symbol}:**\n`;
                        if (result.success && result.periods && result.periods.length > 0) {
                          // Display each period's value
                          result.periods.forEach((period: any) => {
                            if (period.success && period.value !== null) {
                              const value = period.value;
                              if (typeof value === 'number') {
                                formattedOutput += `- ${period.period}: ${value.toFixed(4)}x\n`;
                              } else {
                                formattedOutput += `- ${period.period}: ${value}\n`;
                              }
                            } else {
                              formattedOutput += `- ${period.period}: N/A\n`;
                            }
                          });
                          formattedOutput += `- Formula: ${result.formula}\n`;
                        } else {
                          formattedOutput += `- Error: ${result.error || 'No successful calculations'}\n`;
                        }
                        formattedOutput += '\n';
                      });
                    } else {
                      formattedOutput += `Result: ${JSON.stringify(calculationResult, null, 2)}\n`;
                    }

                    formattedOutput += `\n⏱️ Execution Time: ${(executionTime/1000).toFixed(2)}s`;

                    console.log('🎯 About to return formatted output:', formattedOutput.substring(0, 200) + '...');
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
            /* createCustomMetric: {
              description: 'Create a new custom financial metric with JSON AST definition',
              inputSchema: z.object({
                name: z.string().describe('Display name of the metric'),
                description: z.string().describe('What this metric measures'),
                category: z.string().describe('Metric category (profitability, liquidity, efficiency, etc.)'),
                formula: z.string().describe('Human-readable formula description'),
                calculationType: z.enum(['single_period', 'ttm', 'multi_period']).default('ttm').describe('How to calculate across time periods'),
                astDefinition: z.any().describe('JSON AST structure defining the calculation'),
                dataRequirements: z.object({
                  income_statement: z.array(z.string()).optional(),
                  balance_sheet: z.array(z.string()).optional(),
                  cash_flow_statement: z.array(z.string()).optional(),
                  periods_needed: z.array(z.string())
                }).describe('Data requirements specification'),
                isPublic: z.boolean().default(false).describe('Sharing scope: true = organization-wide sharing, false = personal use only')
              }),
              execute: async (params) => {
                try {
                  const metricId = await convex.mutation(api.metrics.create, {
                    name: params.name,
                    description: params.description,
                    category: params.category,
                    formula: params.formula,
                    calculationType: params.calculationType,
                    astDefinition: params.astDefinition,
                    dataRequirements: params.dataRequirements,
                    isPublic: params.isPublic
                  });

                  return `✅ Custom metric "${params.name}" created successfully!\n\n📊 Metric Details:\n- ID: ${metricId}\n- Category: ${params.category}\n- Formula: ${params.formula}\n- Sharing: ${params.isPublic ? 'Organization-wide (team shared)' : 'Personal use only'}\n- Engine: High-Performance JSON AST\n\n🎯 You can now use this metric with calculateMetric.\n\n🧮 AST Structure:\n\`\`\`json\n${JSON.stringify(params.astDefinition, null, 2).substring(0, 300)}${JSON.stringify(params.astDefinition, null, 2).length > 300 ? '...' : ''}\n\`\`\``;
                } catch (error) {
                  return `❌ Failed to create metric: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
              }
            }, */
            // LaTeX 财务指标工具 - 新的灵活LaTeX-first系统 (传入已认证的Convex客户端)
            createLatexMetric: createLatexMetric(convex),
            calculateLatexMetric: calculateLatexMetric(convex),
            searchLatexMetrics: searchLatexMetrics(convex),
            getPopularLatexMetrics: getPopularLatexMetrics(convex),
            // 图表指标工具 - 为TradingView图表添加技术指标
            addChartIndicator,
            // 基本面数据工具 - 添加季度基本面数据到图表子面板
            addFundamentalData: addFundamentalData({ dataStream }),
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
