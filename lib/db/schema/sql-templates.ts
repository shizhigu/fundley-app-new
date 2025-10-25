/**
 * SQL Templates Database Schema
 * User-saved SQL templates for watchlist analysis
 */

export interface SqlTemplate {
  id: string // UUID
  user_id: string // UUID
  name: string
  sql_query: string
  description?: string | null
  created_at: Date
  updated_at: Date
}

export interface SqlTemplateInsert {
  user_id: string
  name: string
  sql_query: string
  description?: string
}

export interface SqlTemplateUpdate {
  name?: string
  sql_query?: string
  description?: string
}
