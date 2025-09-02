/**
 * 自定义指标数据库操作辅助函数
 * 处理server-side的Convex数据库调用
 */

interface CustomMetricData {
  name: string
  description: string
  category: string
  formula: {
    name: string
    sqlTemplate: string          // SQL query template
    description: string          // Description of the SQL query
    dataFields: string[]         // Database fields used (auto-extracted from SQL)
    calculationType: string      // Calculation type ('single_period', 'ttm', 'multi_period')
    userRequirement: string      // User's original requirement
    formula: string              // Natural language formula description
  }
  prompt: string
  isPublic: boolean
}

/**
 * 创建自定义指标（通过API调用）
 */
export async function createCustomMetricInDB(data: CustomMetricData): Promise<{
  success: boolean
  metricId?: string
  error?: string
}> {
  try {
    const response = await fetch('/api/custom-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`
      }
    }

    const result = await response.json()
    return {
      success: true,
      metricId: result.id
    }

  } catch (error) {
    console.error('API call failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * 获取自定义指标详情
 */
export async function getCustomMetricFromDB(metricId: string): Promise<{
  success: boolean
  metric?: any
  error?: string
}> {
  try {
    const response = await fetch(`/api/custom-metrics/${metricId}`, {
      method: 'GET'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Not found' }))
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`
      }
    }

    const metric = await response.json()
    return {
      success: true,
      metric
    }

  } catch (error) {
    console.error('API call failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * 记录指标使用情况
 */
export async function recordMetricUsage(params: {
  metricId: string
  calculationTime?: number
  success: boolean
}): Promise<void> {
  try {
    await fetch('/api/custom-metrics/usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
  } catch (error) {
    console.warn('Failed to record usage:', error)
    // 不抛出错误，使用记录失败不应影响主功能
  }
}

/**
 * 搜索自定义指标
 */
export async function searchCustomMetrics(params: {
  query: string
  includePublic?: boolean
}): Promise<{
  success: boolean
  metrics?: any[]
  error?: string
}> {
  try {
    const url = new URL('/api/custom-metrics/search', 
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    )
    url.searchParams.set('query', params.query)
    if (params.includePublic !== undefined) {
      url.searchParams.set('includePublic', params.includePublic.toString())
    }

    const response = await fetch(url.toString(), {
      method: 'GET'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Search failed' }))
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`
      }
    }

    const metrics = await response.json()
    return {
      success: true,
      metrics
    }

  } catch (error) {
    console.error('API call failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}