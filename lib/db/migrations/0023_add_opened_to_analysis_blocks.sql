-- Add opened field to analysis_blocks for unread tracking
-- This allows prioritizing agent-generated blocks that user hasn't seen yet

-- Add opened column (default FALSE for new blocks)
ALTER TABLE analysis_blocks
ADD COLUMN IF NOT EXISTS opened BOOLEAN DEFAULT FALSE;

-- Set existing blocks as opened (assume already seen)
UPDATE analysis_blocks
SET opened = TRUE
WHERE opened IS NULL;

-- Create partial index for efficient unopened queries
CREATE INDEX IF NOT EXISTS idx_analysis_blocks_unopened
ON analysis_blocks (user_id, created_at DESC)
WHERE opened = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN analysis_blocks.opened IS 'Whether user has opened/viewed this block. Used to prioritize agent-generated reports.';
