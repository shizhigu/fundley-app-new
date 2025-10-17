-- Migration: Extend analysis_blocks for notebook-based workflow
-- Created: 2025-10-16
-- Description: Add fields to support independent blocks with notebook workflow while preserving existing chat-based fields

-- Add new fields to analysis_blocks (preserving existing chat_id and content fields)
ALTER TABLE analysis_blocks
  -- Source tracking (mixed approach - optional for traceability)
  ADD COLUMN IF NOT EXISTS source_chat_id UUID,
  ADD COLUMN IF NOT EXISTS created_in_message_id UUID,

  -- Notebook workflow
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS notebook_path TEXT,

  -- Metadata for organization and discovery
  ADD COLUMN IF NOT EXISTS symbols TEXT[],
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS description TEXT,

  -- Template features
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_category TEXT,

  -- Timestamps (additional)
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_analysis_blocks_user_id
  ON analysis_blocks(user_id);

CREATE INDEX IF NOT EXISTS idx_analysis_blocks_source_chat
  ON analysis_blocks(source_chat_id);

CREATE INDEX IF NOT EXISTS idx_analysis_blocks_symbols
  ON analysis_blocks USING GIN(symbols);

CREATE INDEX IF NOT EXISTS idx_analysis_blocks_tags
  ON analysis_blocks USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_analysis_blocks_is_template
  ON analysis_blocks(is_template) WHERE is_template = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analysis_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_analysis_blocks_updated_at ON analysis_blocks;

CREATE TRIGGER trigger_update_analysis_blocks_updated_at
  BEFORE UPDATE ON analysis_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_analysis_blocks_updated_at();

-- Add comments for new fields
COMMENT ON COLUMN analysis_blocks.source_chat_id IS 'Optional: Original chat where this block was created (for traceability)';
COMMENT ON COLUMN analysis_blocks.created_in_message_id IS 'Optional: Message ID that created this block';
COMMENT ON COLUMN analysis_blocks.user_id IS 'User who owns this block (for notebook workflow)';
COMMENT ON COLUMN analysis_blocks.title IS 'Block title (for notebook workflow)';
COMMENT ON COLUMN analysis_blocks.notebook_path IS 'Path to analysis.ipynb file (for notebook workflow)';
COMMENT ON COLUMN analysis_blocks.symbols IS 'Stock symbols analyzed in this block';
COMMENT ON COLUMN analysis_blocks.tags IS 'User-defined tags for organization';
COMMENT ON COLUMN analysis_blocks.description IS 'Block description for discovery';
COMMENT ON COLUMN analysis_blocks.is_template IS 'Whether this block is marked as a reusable template';
COMMENT ON COLUMN analysis_blocks.template_category IS 'Category for template organization';
COMMENT ON COLUMN analysis_blocks.updated_at IS 'Timestamp when block was last updated';
COMMENT ON COLUMN analysis_blocks.last_accessed_at IS 'Timestamp when block was last accessed';

-- Create block_references table for knowledge graph (Phase 3)
CREATE TABLE IF NOT EXISTS block_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_block_id UUID NOT NULL REFERENCES analysis_blocks(id) ON DELETE CASCADE,
  to_block_id UUID NOT NULL REFERENCES analysis_blocks(id) ON DELETE CASCADE,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT different_blocks CHECK (from_block_id != to_block_id)
);

CREATE INDEX IF NOT EXISTS idx_block_references_from
  ON block_references(from_block_id);

CREATE INDEX IF NOT EXISTS idx_block_references_to
  ON block_references(to_block_id);

COMMENT ON TABLE block_references IS 'Tracks references between analysis blocks for knowledge graph';
COMMENT ON COLUMN block_references.reference_type IS 'Type of reference (e.g., "uses_template", "extends", "compares")';
