-- Rollback: Remove extra fields added by migration 009
-- Created: 2025-10-16
-- Description: Keep only essential fields (source_chat_id, notebook_path, user_id)

-- Drop unnecessary columns
ALTER TABLE analysis_blocks
  DROP COLUMN IF EXISTS created_in_message_id,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS symbols,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS is_template,
  DROP COLUMN IF EXISTS template_category,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS last_accessed_at;

-- Drop associated indexes
DROP INDEX IF EXISTS idx_analysis_blocks_symbols;
DROP INDEX IF EXISTS idx_analysis_blocks_tags;
DROP INDEX IF EXISTS idx_analysis_blocks_is_template;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_analysis_blocks_updated_at ON analysis_blocks;
DROP FUNCTION IF EXISTS update_analysis_blocks_updated_at();

-- Drop block_references table (not needed for now)
DROP TABLE IF EXISTS block_references;

-- Keep these columns (already exist):
-- - source_chat_id (already has index)
-- - notebook_path
-- - user_id (already has index)
