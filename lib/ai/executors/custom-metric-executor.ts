import vm from 'vm'
import { getFinancialData } from '@/lib/ai/tools/financial/unified-financial-data'

/**
 * 安全的自定义指标代码执行器
 * 使用Node.js vm模块在受限环境中执行用户生成的计算代码
 */
export class CustomMetricExecutor {
  /**
   * 安全执行自定义指标代码
   */
  async execute(params: {
    code: string
    symbols: string[]
    dependencies: string[]
    timeframe?: 'ttm' | 'historical' | 'both'
  }): Promise<{
    success: boolean
    results?: any
    error?: string
    executionTime?: number
  }> {
    const { code, symbols, dependencies, timeframe = 'ttm' } = params
    const startTime = Date.now()

    try {
      // Step 1: 获取所需的财务数据
      const financialData = await this.getRequiredData(symbols, dependencies, timeframe)
      
      if (!financialData.success) {
        return {
          success: false,
          error: `数据获取失败: ${financialData.error}`,
          executionTime: Date.now() - startTime
        }
      }

      // Step 2: 在安全环境中执行代码
      const result = await this.executeCodeSafely(code, financialData.data)

      return {
        success: true,
        results: result,
        executionTime: Date.now() - startTime
      }

    } catch (error) {
      console.error('Custom metric execution failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '代码执行失败',
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * 获取代码执行所需的财务数据
   */
  private async getRequiredData(
    symbols: string[], 
    dependencies: string[], 
    timeframe: 'ttm' | 'historical' | 'both'
  ) {
    try {
      // 构建fieldsByDataType参数
      const fieldsByDataType: Record<string, string[]> = {}
      
      // 为每个数据类型添加常用字段
      dependencies.forEach(dataType => {
        switch (dataType) {
          case 'getIncomeStatement':
            fieldsByDataType[dataType] = [
              'revenue', 'operatingIncome', 'netIncome', 'grossProfit',
              'operatingExpenses', 'incomeTaxExpense', 'incomeBeforeTax',
              'interestExpense', 'ebitda'
            ]
            break
          case 'getBalanceSheet':
            fieldsByDataType[dataType] = [
              'totalAssets', 'totalCurrentAssets', 'totalCurrentLiabilities',
              'totalLiabilities', 'totalStockholdersEquity', 'cash',
              'inventory', 'totalDebt', 'longTermDebt'
            ]
            break
          case 'getCashFlow':
            fieldsByDataType[dataType] = [
              'operatingCashFlow', 'freeCashFlow', 'capitalExpenditure',
              'cashFlowFromOperations', 'cashFlowFromInvestments',
              'cashFlowFromFinancing'
            ]
            break
          case 'getKeyMetrics':
            fieldsByDataType[dataType] = [
              'returnOnEquity', 'returnOnAssets', 'debtToEquity',
              'currentRatio', 'priceToBookRatio', 'priceToEarningsRatio',
              'freeCashFlowYield', 'debtToAssets'
            ]
            break
          case 'getFinancialRatios':
            fieldsByDataType[dataType] = [
              'currentRatio', 'quickRatio', 'grossProfitMargin',
              'operatingProfitMargin', 'netProfitMargin', 'returnOnEquity',
              'returnOnAssets', 'debtRatio'
            ]
            break
        }
      })

      // 调用unified financial data工具
      const result = await getFinancialData.execute({
        symbols,
        fieldsByDataType,
        timeframe,
        limit: timeframe === 'historical' ? 5 : 1
      })

      return result

    } catch (error) {
      console.error('Failed to get required data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '数据获取失败'
      }
    }
  }

  /**
   * 在受限环境中安全执行代码
   */
  private async executeCodeSafely(code: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // 创建受限的执行上下文
        const context = vm.createContext({
          // 提供安全的全局对象
          data,
          getFinancialData, // 允许访问财务数据工具
          Math,              // 数学函数
          Date,              // 日期函数
          Number,            // 数字转换
          String,            // 字符串操作
          parseFloat,        // 浮点数解析
          parseInt,          // 整数解析
          isNaN,             // NaN检查
          isFinite,          // 有限数检查
          
          // 受限的console（仅用于调试）
          console: {
            log: (...args: any[]) => console.log('[CUSTOM_METRIC]', ...args),
            error: (...args: any[]) => console.error('[CUSTOM_METRIC_ERROR]', ...args)
          },

          // 明确禁止的对象
          process: undefined,
          global: undefined,
          require: undefined,
          module: undefined,
          exports: undefined,
          __dirname: undefined,
          __filename: undefined,
          Buffer: undefined,
          
          // 结果存储
          __result: null
        })

        // 包装代码以捕获结果
        const wrappedCode = `
          try {
            __result = (function() {
              ${code}
            })();
          } catch (error) {
            __result = {
              error: true,
              message: error.message || '执行错误'
            };
          }
        `

        // 执行代码
        vm.runInContext(wrappedCode, context, {
          timeout: 10000,        // 10秒超时
          displayErrors: true,
          contextName: 'custom-metric-execution'
        })

        // 获取执行结果
        const result = context.__result

        if (result && result.error) {
          reject(new Error(result.message))
        } else {
          resolve(result)
        }

      } catch (error) {
        // 处理vm执行错误
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            reject(new Error('代码执行超时，可能存在无限循环'))
          } else if (error.message.includes('not defined')) {
            reject(new Error('代码使用了未定义的变量或函数'))
          } else {
            reject(new Error(`代码执行错误: ${error.message}`))
          }
        } else {
          reject(new Error('未知执行错误'))
        }
      }
    })
  }

  /**
   * 验证执行结果格式
   */
  validateResult(result: any): { valid: boolean; error?: string } {
    if (!result) {
      return { valid: false, error: '执行结果为空' }
    }

    if (result.error) {
      return { valid: false, error: result.message || '执行过程中发生错误' }
    }

    // 检查必需的字段
    const requiredFields = ['metricValue', 'symbol']
    for (const field of requiredFields) {
      if (result[field] === undefined) {
        return { valid: false, error: `缺少必需字段: ${field}` }
      }
    }

    // 检查metricValue类型
    if (result.metricValue !== null && typeof result.metricValue !== 'number') {
      return { valid: false, error: 'metricValue必须是数字类型' }
    }

    return { valid: true }
  }
}