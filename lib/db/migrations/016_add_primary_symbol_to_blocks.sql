-- Migration: Add primary_symbol to analysis_blocks
-- Created: 2025-10-18
-- Description: Add logo display support for analysis blocks

-- Add primary_symbol column
ALTER TABLE analysis_blocks
ADD COLUMN IF NOT EXISTS primary_symbol TEXT;

-- Add index for symbol lookups
CREATE INDEX IF NOT EXISTS idx_analysis_blocks_primary_symbol
ON analysis_blocks (primary_symbol);

-- Add comment
COMMENT ON COLUMN analysis_blocks.primary_symbol IS 'Primary ticker symbol for this analysis (uppercase, e.g., AAPL). Used for logo display via FMP API: https://images.financialmodelingprep.com/symbol/{SYMBOL}.png';
