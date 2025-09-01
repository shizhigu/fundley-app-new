import { tool } from 'ai'
import { z } from 'zod'
import { CustomMetricCodeGenerator } from '@/lib/ai/agents/custom-metric-code-generator'
import { CustomMetricExecutor } from '@/lib/ai/executors/custom-metric-executor'
import { 
  createCustomMetricInDB,
  getCustomMetricFromDB,
  recordMetricUsage,
  searchCustomMetrics
} from '@/lib/ai/utils/custom-metric-api'

/**
 * 工具1: 创建自定义财务指标
 * 将用户需求转换为可执行的TypeScript代码并保存
 */
export const createCustomMetric = tool({
  description: `创建自定义财务指标计算代码。

  🚨 重要：只有在用户提供了完整、具体的参数时才能使用此工具！
  
  必须先向用户询问以下信息，直到获得具体答案：
  1. 指标的英文名称（如 "ROIIC", "QuickRatio"）
  2. 指标的中文显示名称（如 "投资资本回报率", "速动比率"）
  3. 指标的详细计算公式（具体数学表达式，不能含糊）
  4. 需要哪些具体的财务数据字段（如 revenue, totalAssets）
  5. 指标的业务用途和意义
  
  ❌ 禁止行为：
  - 不要根据用户的模糊描述自己推测具体参数
  - 不要使用"一般来说"、"通常"等模糊表述
  - 不要自己决定计算公式
  
  ✅ 正确做法：
  - 主动询问缺失的具体参数
  - 要求用户提供精确的计算公式
  - 确认每个数据字段的准确名称`,

  parameters: z.object({
    name: z.string().describe('指标英文名称，如 "ROIIC", "CashConversionCycle"'),
    displayName: z.string().describe('指标中文显示名称，如 "投资资本回报率", "现金转换周期"'),
    description: z.string().describe('指标的详细说明，包括计算逻辑和用途'),
    userRequirement: z.string().describe('用户的原始需求描述'),
    imageContent: z.any().optional().describe('公式图片内容（multimodal支持）'),
    category: z.string().default('custom').describe('指标分类，如 profitability, liquidity, efficiency')
  }),

  execute: async ({ name, displayName, description, userRequirement, imageContent, category }) => {
    try {
      console.log(`Creating custom metric: ${name}`)
      
      // Step 1: 生成计算代码
      const codeGenerator = new CustomMetricCodeGenerator()
      const codeResult = await codeGenerator.generateCode({
        name,
        description,
        userRequirement,
        imageContent
      })

      // Step 2: 验证代码安全性
      const validation = codeGenerator.validateCodeSafety(codeResult.code)
      if (!validation.safe) {
        return {
          success: false,
          error: `代码安全验证失败: ${validation.errors.join(', ')}`,
          displayAction: 'Create custom metric',
          displayResult: '❌ 代码安全验证失败'
        }
      }

      // Step 3: 保存到数据库
      const dbResult = await createCustomMetricInDB({
        name: displayName,
        description,
        category,
        formula: {
          name,
          code: codeResult.code,
          dependencies: codeResult.dependencies,
          userRequirement,
          imageUrl: imageContent // 兼容数据库字段名
        },
        prompt: codeResult.explanation,
        isPublic: false
      })

      if (!dbResult.success) {
        return {
          success: false,
          error: `保存到数据库失败: ${dbResult.error}`,
          displayAction: 'Create custom metric',
          displayResult: '❌ 数据库保存失败'
        }
      }

      console.log(`Custom metric created with ID: ${dbResult.metricId}`)

      return {
        success: true,
        metricId: dbResult.metricId!,
        name: displayName,
        code: codeResult.code,
        dependencies: codeResult.dependencies,
        explanation: codeResult.explanation,
        displayAction: 'Create custom metric',
        displayResult: `✅ 创建了自定义指标: ${displayName}`
      }

    } catch (error) {
      console.error('Create custom metric failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建自定义指标失败',
        displayAction: 'Create custom metric',
        displayResult: `❌ 创建失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
})

/**
 * 工具2: 执行自定义财务指标计算
 * 根据已保存的指标代码执行计算并返回结果
 */
export const executeCustomMetric = tool({
  description: `执行自定义财务指标计算。

  使用已创建的自定义指标对指定公司进行计算分析。
  支持单个或多个公司的批量计算。
  
  示例使用场景:
  - 计算苹果公司的ROIIC
  - 对比多家科技公司的投资回报率
  - 分析历史趋势数据`,

  parameters: z.object({
    metricId: z.string().describe('自定义指标的ID'),
    symbols: z.array(z.string()).min(1).describe('股票代码列表，如 ["AAPL"] 或 ["AAPL", "MSFT"]'),
    timeframe: z.enum(['ttm', 'historical', 'both']).default('ttm').describe('数据时间范围: ttm=最新12个月, historical=历史趋势, both=综合分析'),
    limit: z.number().optional().default(5).describe('历史数据期数限制(1-10)')
  }),

  execute: async ({ metricId, symbols, timeframe, limit = 5 }) => {
    try {
      console.log(`Executing custom metric ${metricId} for symbols:`, symbols)

      // Step 1: 获取指标定义
      const metricResult = await getCustomMetricFromDB(metricId)

      if (!metricResult.success || !metricResult.metric) {
        return {
          success: false,
          error: metricResult.error || '指标不存在或无访问权限',
          displayAction: 'Execute custom metric',
          displayResult: '❌ 指标不存在'
        }
      }

      const metric = metricResult.metric

      // Step 2: 执行计算
      const executor = new CustomMetricExecutor()
      const executionResult = await executor.execute({
        code: metric.formula.code,
        symbols,
        dependencies: metric.formula.dependencies,
        timeframe
      })

      if (!executionResult.success) {
        return {
          success: false,
          error: executionResult.error,
          displayAction: 'Execute custom metric',
          displayResult: `❌ 执行失败: ${executionResult.error}`
        }
      }

      // Step 3: 验证和格式化结果
      const validation = executor.validateResult(executionResult.results)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          displayAction: 'Execute custom metric',
          displayResult: `❌ 结果验证失败: ${validation.error}`
        }
      }

      // Step 4: 记录使用情况
      await recordMetricUsage({
        metricId,
        calculationTime: executionResult.executionTime,
        success: true
      })

      // Step 5: 格式化返回结果
      const results = executionResult.results
      const formattedResult = formatResults(metric.name, results, symbols, timeframe)

      return {
        success: true,
        metricName: metric.name,
        symbols,
        timeframe,
        executionTime: executionResult.executionTime,
        results: results,
        formattedResults: formattedResult,
        displayAction: 'Execute custom metric',
        displayResult: `✅ ${metric.name} 计算完成 (${executionResult.executionTime}ms)`
      }

    } catch (error) {
      console.error('Execute custom metric failed:', error)

      // 记录失败的使用情况
      await recordMetricUsage({
        metricId,
        calculationTime: 0,
        success: false
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : '执行自定义指标失败',
        displayAction: 'Execute custom metric',
        displayResult: `❌ 执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
})

/**
 * 格式化计算结果为用户友好的显示格式
 */
function formatResults(metricName: string, results: any, symbols: string[], timeframe: string): string {
  const lines: string[] = []
  
  lines.push(`=== ${metricName} 计算结果 ===`)
  lines.push(`分析范围: ${symbols.join(', ')} | 时间框架: ${timeframe}`)
  lines.push('')

  if (results.error) {
    lines.push(`❌ 计算失败: ${results.message}`)
    return lines.join('\n')
  }

  // 主要结果
  lines.push(`📊 ${results.symbol || symbols[0]}:`)
  
  if (results.metricValue !== null && results.metricValue !== undefined) {
    lines.push(`   ${metricName}: ${results.metricValue}`)
    
    if (results.metricPercentage) {
      lines.push(`   百分比形式: ${results.metricPercentage}`)
    }
  }

  // 组成部分分析
  if (results.components) {
    lines.push('')
    lines.push('📋 计算组成:')
    
    Object.entries(results.components).forEach(([key, value]) => {
      if (typeof value === 'number') {
        lines.push(`   ${key}: ${value.toLocaleString()}`)
      } else {
        lines.push(`   ${key}: ${value}`)
      }
    })
  }

  // 时间信息
  if (results.period) {
    lines.push('')
    lines.push(`📅 数据期间: ${results.period}`)
  }

  return lines.join('\n')
}

/**
 * 工具3: 查找现有自定义指标
 * 帮助主Agent判断是否需要创建新指标
 */
export const findCustomMetric = tool({
  description: `查找现有的自定义财务指标。

  在创建新指标之前，先检查是否已有相似的指标存在。
  支持按名称、描述内容进行模糊匹配。`,

  parameters: z.object({
    query: z.string().describe('搜索关键词，如指标名称或描述'),
    includePublic: z.boolean().default(true).describe('是否包含公开指标')
  }),

  execute: async ({ query, includePublic }) => {
    try {
      const searchResult = await searchCustomMetrics({
        query,
        includePublic
      })

      if (!searchResult.success) {
        return {
          success: false,
          error: searchResult.error,
          displayAction: 'Search custom metrics',
          displayResult: `❌ 搜索失败: ${searchResult.error}`
        }
      }

      const results = searchResult.metrics || []

      if (results.length === 0) {
        return {
          success: true,
          found: false,
          metrics: [],
          displayAction: 'Search custom metrics',
          displayResult: '未找到匹配的自定义指标'
        }
      }

      // 格式化搜索结果
      const formattedMetrics = results.map((metric: any) => ({
        id: metric._id,
        name: metric.name,
        description: metric.description,
        category: metric.category,
        createdAt: new Date(metric.createdAt).toLocaleDateString(),
        isPublic: metric.isPublic
      }))

      return {
        success: true,
        found: true,
        metrics: formattedMetrics,
        count: results.length,
        displayAction: 'Search custom metrics',
        displayResult: `找到 ${results.length} 个匹配的指标`
      }

    } catch (error) {
      console.error('Find custom metric failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '搜索失败',
        displayAction: 'Search custom metrics',
        displayResult: `❌ 搜索失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }
})