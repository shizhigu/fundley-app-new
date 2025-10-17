-- Migration: Add simple block modification tracking
-- Created: 2025-10-16
-- Description: Minimal changes to track block modifications without breaking existing structure

-- Add only essential fields to analysis_blocks
ALTER TABLE analysis_blocks
  ADD COLUMN IF NOT EXISTS source_chat_id UUID REFERENCES chats(id),
  ADD COLUMN IF NOT EXISTS notebook_path TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create simple modification history table
CREATE TABLE IF NOT EXISTS block_modification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES analysis_blocks(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  modification_type TEXT NOT NULL, -- 'create' or 'update'
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analysis_blocks_source_chat ON analysis_blocks(source_chat_id);
CREATE INDEX IF NOT EXISTS idx_analysis_blocks_user_id ON analysis_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_block_modification_history_block_id ON block_modification_history(block_id);
CREATE INDEX IF NOT EXISTS idx_block_modification_history_chat_id ON block_modification_history(chat_id);

-- Comments
COMMENT ON COLUMN analysis_blocks.source_chat_id IS 'Original chat where block was created (for traceability)';
COMMENT ON COLUMN analysis_blocks.notebook_path IS 'Path to analysis.ipynb file for notebook workflow';
COMMENT ON COLUMN analysis_blocks.user_id IS 'User who owns this block';
COMMENT ON TABLE block_modification_history IS 'Simple log of which chats have modified each block';
