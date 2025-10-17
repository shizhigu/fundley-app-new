-- Migration: Remove notebook_path field (redundant - can be computed from user_id and block_id)
-- Created: 2025-10-16
-- Description: notebook_path is always /tmp/fundley/{user_id}/blocks/{block_id}/analysis.ipynb

-- Remove notebook_path column
ALTER TABLE analysis_blocks
  DROP COLUMN IF EXISTS notebook_path;

-- Note: Path can be computed as: f"/tmp/fundley/{user_id}/blocks/{block_id}/analysis.ipynb"
