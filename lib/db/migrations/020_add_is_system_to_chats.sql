-- Migration 020: Add is_system field to chats table
-- Purpose: Hide system-generated chats (scheduled tasks, automated operations) from user's chat list

-- Add is_system column (default FALSE for existing chats)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_chats_is_system ON chats(is_system);

-- Create index for common query pattern (user_id + is_system)
CREATE INDEX IF NOT EXISTS idx_chats_user_system ON chats(user_id, is_system);

COMMENT ON COLUMN chats.is_system IS 'TRUE for system-generated chats (scheduled tasks, etc.), FALSE for user chats. Frontend should filter WHERE is_system = FALSE';
