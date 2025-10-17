-- Migration: Clean up unnecessary fields from analysis_blocks
-- Created: 2025-10-17
-- Description: Remove fields added by migration 009 that are not needed

-- First, backfill updated_at with the latest modification time or created_at
UPDATE analysis_blocks ab
SET updated_at = COALESCE(
  (
    SELECT MAX(bmh.modified_at)
    FROM block_modification_history bmh
    WHERE bmh.block_id = ab.id
  ),
  ab.created_at
)
WHERE updated_at IS NULL;

-- Drop unnecessary indexes
DROP INDEX IF EXISTS idx_analysis_blocks_symbols;
DROP INDEX IF EXISTS idx_analysis_blocks_tags;
DROP INDEX IF EXISTS idx_analysis_blocks_is_template;

-- Drop block_references table (not needed for current workflow)
DROP TABLE IF EXISTS block_references CASCADE;

-- Remove unnecessary columns
ALTER TABLE analysis_blocks
  DROP COLUMN IF EXISTS created_in_message_id,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS notebook_path,
  DROP COLUMN IF EXISTS symbols,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS is_template,
  DROP COLUMN IF EXISTS template_category,
  DROP COLUMN IF EXISTS last_accessed_at;

-- Verify final structure
COMMENT ON TABLE analysis_blocks IS 'Flexible storage for AI-generated analysis blocks with modification tracking';
COMMENT ON COLUMN analysis_blocks.id IS 'Unique block identifier';
COMMENT ON COLUMN analysis_blocks.chat_id IS 'Chat where block is currently displayed (legacy compatibility)';
COMMENT ON COLUMN analysis_blocks.user_id IS 'User who owns this block';
COMMENT ON COLUMN analysis_blocks.source_chat_id IS 'Original chat where block was created';
COMMENT ON COLUMN analysis_blocks.content IS 'Flexible JSONB storage - structure determined by agents (includes title, text, data, etc.)';
COMMENT ON COLUMN analysis_blocks.created_at IS 'When the block was first created';
COMMENT ON COLUMN analysis_blocks.updated_at IS 'Last modification time (auto-updated by triggers)';
