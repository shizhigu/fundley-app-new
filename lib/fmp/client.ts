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

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getFmpApiKey()
  }

  async get(endpoint: string, params: Record<string, any> = {}) {
    // Build cache key
    const cacheKey = `fmp:${endpoint}:${JSON.stringify(params)}`
    
    // Try to get from cache first
    if (redisClient?.isReady) {
      try {
        const cached = await redisClient.get(cacheKey)
        if (cached) {
          console.log(`Cache hit for ${cacheKey}`)
          return JSON.parse(cached)
        }
      } catch (error) {
        console.error('Redis cache error:', error)
      }
    }

    // Build URL with parameters
    const url = new URL(`${FMP_BASE_URL}${endpoint}`)
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })
    url.searchParams.append('apikey', this.apiKey)

    // Fetch from API
    console.log(`Fetching from FMP: ${url.pathname}`)
    console.log(`Full URL: ${url.toString()}`)
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Cache the result
    if (redisClient?.isReady && data) {
      try {
        // Cache for 1 hour for most data, 5 minutes for real-time quotes
        const ttl = endpoint.includes('quote') ? 300 : 3600
        await redisClient.setEx(cacheKey, ttl, JSON.stringify(data))
      } catch (error) {
        console.error('Redis cache write error:', error)
      }
    }

    return data
  }

  // Specific method for income statement
  async getIncomeStatement(symbol: string, period?: string, limit?: number) {
    const params: Record<string, any> = { symbol }
    if (period) params.period = period
    if (limit) params.limit = limit
    
    return this.get('/income-statement', params)
  }

  // Specific method for balance sheet
  async getBalanceSheet(symbol: string, period?: string, limit?: number) {
    const params: Record<string, any> = { symbol }
    if (period) params.period = period
    if (limit) params.limit = limit
    
    return this.get('/balance-sheet', params)
  }

  // Specific method for cash flow
  async getCashFlow(symbol: string, period?: string, limit?: number) {
    const params: Record<string, any> = { symbol }
    if (period) params.period = period
    if (limit) params.limit = limit
    
    return this.get('/cash-flow-statement', params)
  }

  // Specific method for ratios
  async getRatios(symbol: string, period?: string, limit?: number) {
    const params: Record<string, any> = { symbol }
    if (period) params.period = period
    if (limit) params.limit = limit
    
    return this.get('/ratios', params)
  }

  // Alias for financial ratios (same as getRatios but with consistent naming)
  async getFinancialRatios(symbol: string, period?: string, limit?: number) {
    return this.getRatios(symbol, period, limit)
  }

  // Specific method for key metrics
  async getKeyMetrics(symbol: string, period?: string, limit?: number) {
    const params: Record<string, any> = { symbol }
    if (period) params.period = period
    if (limit) params.limit = limit
    
    return this.get('/key-metrics', params)
  }
}

// Export singleton instance
export const fmpClient = new FMPClient()