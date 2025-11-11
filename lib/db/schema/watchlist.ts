/**
 * Watchlist Database Schema
 * User watchlist for tracking stocks, crypto, and options
 */

// Watchlist Groups
export interface WatchlistGroup {
  id: string // UUID
  user_id: string // UUID
  name: string
  description?: string | null
  is_default: boolean
  created_at: Date
  updated_at: Date
}

export interface WatchlistGroupInsert {
  user_id: string
  name: string
  description?: string
  is_default?: boolean
}

export interface WatchlistGroupUpdate {
  name?: string
  description?: string | null
  is_default?: boolean
}

// Watchlist Items
export interface Watchlist {
  id: number
  user_id: string // UUID
  group_id?: string | null // UUID - references watchlist_groups
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
  group_id?: string // UUID
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
  group_id?: string | null
  name?: string
  notes?: string
  tags?: string[]
  alert_price_high?: number | null
  alert_price_low?: number | null
  position_size?: number | null
}
