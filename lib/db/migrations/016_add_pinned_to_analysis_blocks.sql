-- Migration: Add pinned feature to analysis_blocks
-- Created: 2025-10-17
-- Description: Add is_pinned and pinned_at fields to allow users to pin important blocks to top

-- Add pinned fields
ALTER TABLE analysis_blocks
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;

-- Create index for efficient pinned blocks queries
CREATE INDEX IF NOT EXISTS idx_analysis_blocks_pinned ON analysis_blocks(user_id, is_pinned, pinned_at DESC);

-- Add comments
COMMENT ON COLUMN analysis_blocks.is_pinned IS 'Whether this block is pinned to top';
COMMENT ON COLUMN analysis_blocks.pinned_at IS 'When the block was pinned (NULL if not pinned)';
