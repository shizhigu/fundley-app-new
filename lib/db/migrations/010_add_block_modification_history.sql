-- Migration: Add block modification history tracking
-- Created: 2025-10-16
-- Description: Track which chats have modified each block for complete traceability

-- Create block_modification_history table
CREATE TABLE IF NOT EXISTS block_modification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES analysis_blocks(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What changed
  modification_type TEXT NOT NULL, -- 'create', 'update', 'title_change', 'content_change'
  changed_fields TEXT[], -- e.g., ['title', 'text'], ['filenames']

  -- Timestamps
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional: Snapshot of changes (for audit trail)
  previous_value JSONB,
  new_value JSONB
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_block_modification_history_block_id
  ON block_modification_history(block_id);

CREATE INDEX IF NOT EXISTS idx_block_modification_history_chat_id
  ON block_modification_history(chat_id);

CREATE INDEX IF NOT EXISTS idx_block_modification_history_user_id
  ON block_modification_history(user_id);

CREATE INDEX IF NOT EXISTS idx_block_modification_history_modified_at
  ON block_modification_history(modified_at DESC);

-- Composite index for block + time queries
CREATE INDEX IF NOT EXISTS idx_block_modification_history_block_time
  ON block_modification_history(block_id, modified_at DESC);

-- Add comments
COMMENT ON TABLE block_modification_history IS 'Complete history of all modifications to analysis blocks';
COMMENT ON COLUMN block_modification_history.modification_type IS 'Type of modification: create, update, title_change, content_change';
COMMENT ON COLUMN block_modification_history.changed_fields IS 'Array of field names that were changed';
COMMENT ON COLUMN block_modification_history.previous_value IS 'Optional: Previous value before modification (for audit)';
COMMENT ON COLUMN block_modification_history.new_value IS 'Optional: New value after modification (for audit)';

-- Create a view for easy access to modification history with chat titles
CREATE OR REPLACE VIEW block_modification_summary AS
SELECT
  bmh.block_id,
  bmh.chat_id,
  bmh.user_id,
  bmh.modification_type,
  bmh.changed_fields,
  bmh.modified_at,
  c.title as chat_title,
  u.email as user_email,
  ab.title as block_title
FROM block_modification_history bmh
LEFT JOIN chats c ON bmh.chat_id = c.id
LEFT JOIN users u ON bmh.user_id = u.id
LEFT JOIN analysis_blocks ab ON bmh.block_id = ab.id
ORDER BY bmh.modified_at DESC;

COMMENT ON VIEW block_modification_summary IS 'Simplified view of block modifications with related names for UI display';
