import { tool, generateObject } from 'ai';
import { z } from 'zod';
import { financialFieldsModel } from '@/lib/ai/providers';
import { fmpApiTools } from '@/lib/ai/tools/financial/fmp-api-tools';

/**
 * 数据编排代理 - 简化版本
 * 
 * 职责：
 * 1. 根据分析类型预定义映射到具体API工具
 * 2. 并行执行API工具（纯API调用，无LLM）
 * 3. 使用LLM清洗和总结数据
 * 4. 返回干净的结构化数据给主Agent
 */

// 分析类型到工具的预定义映射
const ANALYSIS_TYPE_MAPPING = {
  '13f_tracking': {
    tools: ['get13FFilings', 'getInstitutionalHoldings'],
    description: '13F机构持股追踪分析'
  },
  'institutional_analysis': {
    tools: ['getInstitutionalHoldings'],
    description: '机构持股分析'
  }
} as const;

const DataRequestSchema = z.object({
  symbols: z.array(z.string()).min(1).max(20).describe('股票代码数组'),
  analysisType: z.enum(['13f_tracking', 'institutional_analysis']).describe('分析类型'),
  parameters: z.record(z.any()).optional().default({}).describe('额外参数')
});

const CleanDataResponseSchema = z.object({
  summary: z.string().describe('数据提取的简洁摘要'),
  keyInsights: z.array(z.string()).min(2).max(5).describe('关键数据洞察'),
  dataQuality: z.object({
    completenessScore: z.number().min(0).max(100).describe('数据完整性评分'),
    freshnessScore: z.number().min(0).max(100).describe('数据新鲜度评分'),
    reliabilityScore: z.number().min(0).max(100).describe('数据可靠性评分'),
    confidence: z.enum(['high', 'medium', 'low']).describe('整体数据可信度')
  }),
  structuredData: z.record(z.any()).describe('清洗后的结构化数据')
});

export const dataOrchestratorAgent = tool({
  description: 'Data orchestration agent that fetches clean financial data using FMP API tools. Returns structured clean data for main analysis.',
  inputSchema: DataRequestSchema,
  
  execute: async ({ symbols, analysisType, parameters = {} }) => {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 Data Orchestrator: ${analysisType} for ${symbols.length} symbols`);
      
      // Step 1: 根据分析类型获取工具列表
      const mapping = ANALYSIS_TYPE_MAPPING[analysisType];
      if (!mapping) {
        throw new Error(`Unsupported analysis type: ${analysisType}`);
      }
      
      console.log(`🔧 Selected tools: ${mapping.tools.join(', ')}`);
      
      // Step 2: 并行执行API工具
      const toolResults = await Promise.allSettled(
        mapping.tools.map(async (toolName) => {
          console.log(`📡 Executing ${toolName}...`);
          
          let result;
          switch (toolName) {
            case 'get13FFilings':
              if (fmpApiTools.get13FFilings?.execute) {
                result = await fmpApiTools.get13FFilings.execute({
                  symbol: symbols[0], // 主要关注第一个股票
                  limit: parameters.limit || 100
                }, { 
                  toolCallId: 'get13FFilings-call',
                  messages: []
                });
              } else {
                throw new Error('get13FFilings tool not available');
              }
              break;
              
            case 'getInstitutionalHoldings':
              if (fmpApiTools.getInstitutionalHoldings?.execute) {
                result = await fmpApiTools.getInstitutionalHoldings.execute({
                  symbols: symbols.slice(0, 5), // 限制前5个
                  includeCurrentQuarter: parameters.includeCurrentQuarter !== false,
                  limit: parameters.limit || 50
                }, {
                  toolCallId: 'getInstitutionalHoldings-call',
                  messages: []
                });
              } else {
                throw new Error('getInstitutionalHoldings tool not available');
              }
              break;
              
            default:
              throw new Error(`Unknown tool: ${toolName}`);
          }
          
          return { tool: toolName, ...result };
        })
      );
      
      // Step 3: 处理结果
      const successfulResults: any[] = [];
      const failedResults: any[] = [];
      
      toolResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const value = result.value as any;
          if (value.success) {
            successfulResults.push(value);
          } else {
            failedResults.push({ tool: mapping.tools[index], error: value.error });
          }
        } else {
          failedResults.push({ tool: mapping.tools[index], error: result.reason.message });
        }
      });
      
      if (successfulResults.length === 0) {
        return {
          success: false,
          error: 'All API tools failed',
          failedTools: failedResults,
          executionTimeMs: Date.now() - startTime
        };
      }
      
      console.log(`✅ ${successfulResults.length}/${mapping.tools.length} tools succeeded`);
      
      // Step 4: 使用LLM清洗和总结数据
      const cleaningResult = await generateObject({
        model: financialFieldsModel,
        schema: CleanDataResponseSchema,
        prompt: `作为金融数据分析专家，清洗和总结以下API数据：

**分析类型**: ${mapping.description}
**目标股票**: ${symbols.join(', ')}

**原始API数据**:
${JSON.stringify(successfulResults, null, 2)}

**任务**:
1. 提供数据提取的简洁摘要
2. 识别2-5个关键数据洞察
3. 评估数据质量（完整性、新鲜度、可靠性）
4. 将原始数据转换为结构化格式，去除无关字段

**要求**:
- 只基于提供的数据，不要编造信息
- 如果数据不完整，要在评分中反映
- 结构化数据要简洁，便于后续分析使用`
      });
      
      // Step 5: 返回清洗后的数据
      return {
        success: true,
        analysisType,
        symbols,
        dataSummary: cleaningResult.object.summary,
        keyInsights: cleaningResult.object.keyInsights,
        dataQuality: cleaningResult.object.dataQuality,
        cleanData: {
          structuredData: cleaningResult.object.structuredData,
          toolResults: successfulResults.map(r => ({
            tool: r.tool,
            endpoint: r.endpoint,
            recordCount: r.recordCount,
            success: r.success
          }))
        },
        metadata: {
          sourceApis: [...new Set(successfulResults.map(r => r.endpoint))],
          totalRecords: successfulResults.reduce((sum, r) => sum + (r.recordCount || 0), 0),
          processingTimeMs: Date.now() - startTime,
          executionTimestamp: new Date().toISOString(),
          toolsExecuted: mapping.tools,
          failedTools: failedResults
        }
      };
      
    } catch (error: any) {
      console.error('❌ Data Orchestrator failed:', error);
      return {
        success: false,
        error: error.message,
        analysisType,
        symbols,
        executionTimeMs: Date.now() - startTime,
        metadata: {
          executionTimestamp: new Date().toISOString()
        }
      };
    }
  }
});