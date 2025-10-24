-- Migration 020: Add visibility field to chats table
-- Purpose: Hide system-generated chats (scheduled tasks, automated operations) from user's chat list

-- Add visibility column (default TRUE for existing chats - all visible)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS visibility BOOLEAN DEFAULT TRUE;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_chats_visibility ON chats(visibility);

-- Create index for common query pattern (user_id + visibility)
CREATE INDEX IF NOT EXISTS idx_chats_user_visibility ON chats(user_id, visibility);

COMMENT ON COLUMN chats.visibility IS 'TRUE = visible in user chat list (default), FALSE = hidden (system chats like scheduled tasks)';
