-- Migration: Add attachments support to messages table
-- Description: Add attachments column to store file metadata for user messages

-- Add attachments column as JSONB array
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Add index for attachments queries (optional, for better performance)
CREATE INDEX IF NOT EXISTS idx_messages_attachments
ON messages USING GIN (attachments);

-- Add comment for documentation
COMMENT ON COLUMN messages.attachments IS 'Array of attachment metadata objects containing name, contentType, url, size, etc.';