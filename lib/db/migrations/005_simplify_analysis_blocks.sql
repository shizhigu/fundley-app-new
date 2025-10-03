-- Migration: Simplify analysis_blocks table structure
-- Created: 2025-10-01
-- Description: Simplify the table to give agents full flexibility

-- Drop existing table and recreate with simpler structure
DROP TABLE IF EXISTS analysis_blocks CASCADE;

-- Create simplified table
CREATE TABLE analysis_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,  -- We keep this for querying blocks by chat
  content JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Everything goes here, agent decides structure
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only keep essential indexes
CREATE INDEX idx_analysis_blocks_chat_id ON analysis_blocks(chat_id);
CREATE INDEX idx_analysis_blocks_created_at ON analysis_blocks(created_at DESC);

-- Add comment
COMMENT ON TABLE analysis_blocks IS 'Flexible storage for AI-generated analysis blocks';
COMMENT ON COLUMN analysis_blocks.content IS 'Flexible JSONB storage - structure entirely determined by agents';