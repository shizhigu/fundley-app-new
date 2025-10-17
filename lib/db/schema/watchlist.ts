/**
 * Watchlist Database Schema
 * User watchlist for tracking stocks, crypto, and options
 */

export interface Watchlist {
  id: number
  user_id: string // UUID
  symbol: string
  name?: string | null
  asset_type: 'stock' | 'crypto' | 'option'
  added_at: Date
  notes?: string | null
  tags: string[] // JSONB array
  alert_price_high?: number | null
  alert_price_low?: number | null
  position_size?: number | null
}

export interface WatchlistInsert {
  user_id: string
  symbol: string
  name?: string
  asset_type?: 'stock' | 'crypto' | 'option'
  notes?: string
  tags?: string[]
  alert_price_high?: number
  alert_price_low?: number
  position_size?: number
}

export interface WatchlistUpdate {
  name?: string
  notes?: string
  tags?: string[]
  alert_price_high?: number | null
  alert_price_low?: number | null
  position_size?: number | null
}
