import { createClient } from 'redis'

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable'

// Get API key with runtime fallback
function getFmpApiKey(): string {
  return process.env.FMP_API_KEY || 'hO6rMzU0dLyIEj772CfmFS7JpuMIy5m7'
}

const FMP_API_KEY = getFmpApiKey()

if (!FMP_API_KEY) {
  console.warn('FMP_API_KEY is not set in environment variables')
}

// Initialize Redis client with standard Redis URL
let redisClient: any = null

if (process.env.REDIS_URL) {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL
    })
    
    redisClient.on('error', (err: any) => {
      console.error('Redis Client Error:', err)
    })
    
    // Connect asynchronously
    redisClient.connect().catch((err: any) => {
      console.error('Failed to connect to Redis:', err)
      redisClient = null
    })
  } catch (error) {
    console.error('Failed to initialize Redis client:', error)
    redisClient = null
  }
}

export class FMPClient {
  private apiKey: string
  private cacheHits = 0
  private cacheMisses = 0

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getFmpApiKey()
  }

  /**
   * Get intelligent TTL based on endpoint and data type
   */
  private getTTL(endpoint: string): number {
    // Real-time data - short TTL
    if (endpoint.includes('quote') || endpoint.includes('price')) {
      return 300 // 5 minutes
    }
    
    // TTM data - medium TTL (more stable)
    if (endpoint.includes('-ttm')) {
      return 7200 // 2 hours
    }
    
    // Historical statements - long TTL (rarely change)
    if (endpoint.includes('statement') || endpoint.includes('balance-sheet')) {
      return 86400 // 24 hours
    }
    
    // Ratios and metrics - medium TTL
    if (endpoint.includes('ratios') || endpoint.includes('metrics')) {
      return 14400 // 4 hours
    }
    
    // Default TTL
    return 3600 // 1 hour
  }

  /**
   * Build deterministic cache key that's independent of parameter order
   */
  private buildCacheKey(endpoint: string, params: Record<string, any>): string {
    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(params).sort()
    const normalizedParams: Record<string, any> = {}
    
    sortedKeys.forEach(key => {
      const value = params[key]
      // Normalize values for consistency
      if (typeof value === 'string') {
        normalizedParams[key] = value.toUpperCase() // AAPL vs aapl
      } else {
        normalizedParams[key] = value
      }
    })
    
    return `fmp:${endpoint}:${JSON.stringify(normalizedParams)}`
  }

  /**
   * Get cache statistics
   */
  private getCacheStats(): string {
    const total = this.cacheHits + this.cacheMisses
    if (total === 0) return 'No stats yet'
    const hitRate = (this.cacheHits / total * 100).toFixed(1)
    return `${this.cacheHits}/${total} hits, ${hitRate}% rate`
  }

  /**
   * Get cache statistics (public method)
   */
  public getStats() {
    const total = this.cacheHits + this.cacheMisses
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      hitRate: total > 0 ? (this.cacheHits / total * 100).toFixed(1) : '0.0'
    }
  }

  async get(endpoint: string, params: Record<string, any> = {}) {
    // Build deterministic cache key (order-independent)
    const cacheKey = this.buildCacheKey(endpoint, params)
    
    // Try to get from cache first
    if (redisClient?.isReady) {
      try {
        const cached = await redisClient.get(cacheKey)
        if (cached) {
          this.cacheHits++
          console.log(`✅ Cache hit for ${endpoint} (${this.getCacheStats()})`)
          return JSON.parse(cached)
        }
      } catch (error) {
        console.error('Redis cache error:', error)
      }
    }
    
    // Cache miss - increment counter
    this.cacheMisses++

    // Build URL with parameters
    const url = new URL(`${FMP_BASE_URL}${endpoint}`)
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })
    url.searchParams.append('apikey', this.apiKey)

    // Fetch from API
    console.log(`🔄 Cache miss - Fetching from FMP: ${endpoint} (${this.getCacheStats()})`)
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Cache the result with intelligent TTL
    if (redisClient?.isReady && data) {
      try {
        const ttl = this.getTTL(endpoint)
        await redisClient.setEx(cacheKey, ttl, JSON.stringify(data))
        console.log(`💾 Cached ${endpoint} for ${ttl}s`)
      } catch (error) {
        console.error('Redis cache write error:', error)
      }
    }

    return data
  }

  // Generic method for all financial data endpoints
  async getFinancialData(endpoint: string, symbol: string, period?: string, limit?: number) {
    const params: Record<string, any> = { symbol }
    if (period) params.period = period
    if (limit) params.limit = limit
    
    return this.get(endpoint, params)
  }

  // Legacy methods for backward compatibility (simplified)
  async getIncomeStatement(symbol: string, period?: string, limit?: number) {
    return this.getFinancialData('/income-statement', symbol, period, limit)
  }

  async getBalanceSheet(symbol: string, period?: string, limit?: number) {
    return this.getFinancialData('/balance-sheet', symbol, period, limit)
  }

  async getCashFlow(symbol: string, period?: string, limit?: number) {
    return this.getFinancialData('/cash-flow-statement', symbol, period, limit)
  }

  async getFinancialRatios(symbol: string, period?: string, limit?: number) {
    return this.getFinancialData('/ratios', symbol, period, limit)
  }

  async getKeyMetrics(symbol: string, period?: string, limit?: number) {
    return this.getFinancialData('/key-metrics', symbol, period, limit)
  }
}

// Export singleton instance
export const fmpClient = new FMPClient()