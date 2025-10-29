-- Add metadata column to chats table for scheduled task tracking
-- This allows us to link chats to scheduled tasks and store additional context

-- Add metadata column (JSONB for flexible key-value storage)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_chats_metadata_scheduled_task
ON chats USING gin (metadata);

-- Add comment for documentation
COMMENT ON COLUMN chats.metadata IS 'Flexible metadata storage. Used for scheduled_task_id, execution context, etc.';
