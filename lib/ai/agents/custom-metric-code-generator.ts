import { getLanguageModel } from '@/lib/ai/providers'
import { generateText } from 'ai'
import { z } from 'zod'

/**
 * 专门的财务指标代码生成Agent
 * 负责将用户需求转换为安全的TypeScript计算代码
 */
export class CustomMetricCodeGenerator {

  async generateCode(params: {
    name: string
    description: string
    userRequirement: string
    imageContent?: any // 支持multimodal内容
  }): Promise<{
    code: string
    dependencies: string[]
    explanation: string
  }> {
    const { name, description, userRequirement, imageContent } = params

    const systemPrompt = `You are a financial metric code generator specialist.

🚨 STRICT INPUT VALIDATION:
- If the user requirement is vague or incomplete, throw an error
- Require EXACT field names and calculation formulas
- Do not make assumptions about what the user wants
- All formulas must be mathematically precise

CRITICAL RULES:
1. Generate ONLY safe TypeScript calculation functions
2. Use unified financial data structure: data[symbol].ttm/historical.dataType[0]
3. Always include meaningful variable names and comments in Chinese
4. Return structured results with component breakdown
5. Handle edge cases (division by zero, missing data)
6. Use ONLY basic math operations (+, -, *, /, Math functions)
7. NO external imports, NO file system access, NO network calls
8. REJECT vague requirements - demand specificity

AVAILABLE DATA TYPES:
- getIncomeStatement: revenue, operatingIncome, netIncome, etc.
- getBalanceSheet: totalAssets, totalCurrentLiabilities, etc.
- getCashFlow: operatingCashFlow, freeCashFlow, etc.
- getKeyMetrics: returnOnEquity, debtToEquity, etc.
- getFinancialRatios: currentRatio, quickRatio, etc.

DATA STRUCTURE EXAMPLE:
data = {
  "AAPL": {
    ttm: {
      getIncomeStatement: [{ revenue: 394328000000, operatingIncome: 114301000000, ... }],
      getBalanceSheet: [{ totalAssets: 365725000000, totalCurrentLiabilities: 145308000000, ... }]
    },
    historical: {
      getIncomeStatement: [/* latest */, /* previous periods */],
      getBalanceSheet: [/* latest */, /* previous periods */]
    }
  }
}

TEMPLATE STRUCTURE:
\`\`\`typescript
function calculate{MetricName}(data, getFinancialData) {
  try {
    // 1. 数据提取
    const symbol = Object.keys(data)[0]; // 获取第一个股票代码
    const company = data[symbol];
    
    // 根据需要获取TTM或历史数据
    const incomeData = company.ttm.getIncomeStatement[0];
    const balanceData = company.ttm.getBalanceSheet[0];
    
    // 2. 计算逻辑（使用中文变量名增强可读性）
    const 营业收入 = incomeData.revenue;
    const 营业利润 = incomeData.operatingIncome;
    
    // 3. 防止除零错误
    if (!营业收入 || 营业收入 === 0) {
      throw new Error('营业收入数据缺失或为零');
    }
    
    // 4. 主要计算
    const 指标值 = 营业利润 / 营业收入;
    
    // 5. 返回结构化结果
    return {
      metricValue: 指标值,
      metricPercentage: (指标值 * 100).toFixed(2) + '%',
      symbol: symbol,
      components: {
        营业收入,
        营业利润
      },
      period: incomeData.period || 'TTM'
    };
    
  } catch (error) {
    return {
      error: true,
      message: error.message || '计算过程中发生错误',
      metricValue: null
    };
  }
}

return calculate{MetricName}(data, getFinancialData);
\`\`\`

IMPORTANT: 
- Replace {MetricName} with actual metric name (no spaces)
- Use Chinese comments for clarity
- Always include error handling
- Return null for metricValue on errors
- Include component breakdown for transparency`

    try {
      // 硬性验证：必要参数存在性（业务逻辑）
      if (!name || !description || !userRequirement) {
        throw new Error('缺少必要参数：指标名称、计算描述、需求描述')
      }
      
      // 硬性验证：基本数据格式
      if (typeof name !== 'string' || typeof description !== 'string' || typeof userRequirement !== 'string') {
        throw new Error('参数格式错误：所有参数必须是字符串')
      }
      
      // LLM 负责判断内容是否完整和合理，这里不做具体业务逻辑验证

      // 构建严格的用户消息内容
      const userContent = imageContent 
        ? [
            {
              type: 'text',
              text: `⚠️ 严格按照以下信息生成代码，不得添加任何假设：\n\n指标名称：${name}\n计算公式：${description}\n用户要求：${userRequirement}\n\n如果信息不够具体，返回错误而不是猜测。根据图片内容生成精确的TypeScript代码。`
            },
            {
              type: 'image',
              image: imageContent
            }
          ]
        : `⚠️ 严格按照以下信息生成代码，不得添加任何假设：\n\n指标名称：${name}\n计算公式：${description}\n用户要求：${userRequirement}\n\n如果以上信息不够具体明确，请返回错误信息而不是自己推测计算方法。`

      const model = getLanguageModel('grok-3')
      
      const response = await generateText({
        model,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userContent
        }],
        temperature: 0.1, // 降低随机性，确保代码稳定
        maxTokens: 2000
      })

      const generatedCode = response.text
      
      // 提取代码块
      const codeMatch = generatedCode.match(/```typescript\s*([\s\S]*?)\s*```/)
      const cleanCode = codeMatch ? codeMatch[1] : generatedCode

      // 分析依赖的数据类型
      const dependencies = this.extractDependencies(cleanCode)

      // 生成解释
      const explanation = `自动生成的${name}计算代码，包含错误处理和结构化输出`

      return {
        code: cleanCode,
        dependencies,
        explanation
      }

    } catch (error) {
      console.error('Code generation failed:', error)
      throw new Error(`代码生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 从代码中提取数据依赖
   */
  private extractDependencies(code: string): string[] {
    const dependencies: string[] = []
    
    // 匹配数据类型访问模式
    const dataTypePatterns = [
      /getIncomeStatement/g,
      /getBalanceSheet/g,
      /getCashFlow/g,
      /getKeyMetrics/g,
      /getFinancialRatios/g
    ]

    dataTypePatterns.forEach((pattern) => {
      const matches = code.match(pattern)
      if (matches) {
        const dataType = pattern.source
        if (!dependencies.includes(dataType)) {
          dependencies.push(dataType)
        }
      }
    })

    return dependencies
  }

  /**
   * 验证生成的代码安全性
   */
  validateCodeSafety(code: string): { safe: boolean; errors: string[] } {
    const errors: string[] = []
    
    // 危险模式检测
    const dangerousPatterns = [
      { pattern: /require\s*\(/g, message: '禁止使用require()' },
      { pattern: /import\s+/g, message: '禁止使用import语句' },
      { pattern: /eval\s*\(/g, message: '禁止使用eval()' },
      { pattern: /Function\s*\(/g, message: '禁止使用Function构造器' },
      { pattern: /process\./g, message: '禁止访问process对象' },
      { pattern: /global\./g, message: '禁止访问global对象' },
      { pattern: /fs\./g, message: '禁止文件系统操作' },
      { pattern: /fetch\s*\(/g, message: '禁止网络请求' },
      { pattern: /XMLHttpRequest/g, message: '禁止XMLHttpRequest' },
      { pattern: /while\s*\(/g, message: '禁止while循环（防止死循环）' },
      { pattern: /for\s*\(/g, message: '禁止for循环（防止死循环）' }
    ]

    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(code)) {
        errors.push(message)
      }
    })

    // 检查是否有return语句
    if (!/return\s+/.test(code)) {
      errors.push('代码必须包含return语句')
    }

    // 检查函数结构
    if (!/function\s+calculate\w+\s*\(/g.test(code)) {
      errors.push('代码必须包含calculate开头的函数')
    }

    return {
      safe: errors.length === 0,
      errors
    }
  }
}