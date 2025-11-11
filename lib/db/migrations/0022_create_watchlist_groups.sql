-- Migration: Add watchlist groups support
-- Description: Allow users to create multiple watchlist groups
-- Date: 2025-01-15

-- Create watchlist_groups table
CREATE TABLE IF NOT EXISTS watchlist_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique group names per user
    UNIQUE(user_id, name)
);

-- Create index for faster lookups
CREATE INDEX idx_watchlist_groups_user_id ON watchlist_groups(user_id);
CREATE INDEX idx_watchlist_groups_user_default ON watchlist_groups(user_id, is_default);

-- Add group_id column to watchlist table
ALTER TABLE watchlist
ADD COLUMN group_id UUID REFERENCES watchlist_groups(id) ON DELETE CASCADE;

-- Create index on group_id
CREATE INDEX idx_watchlist_group_id ON watchlist(group_id);

-- Drop old unique constraint (user_id, symbol)
ALTER TABLE watchlist DROP CONSTRAINT IF EXISTS watchlist_user_id_symbol_key;

-- Add new unique constraint allowing same symbol in different groups
-- Note: NULL group_id is allowed (for backward compatibility)
ALTER TABLE watchlist ADD CONSTRAINT watchlist_user_group_symbol_key
UNIQUE NULLS NOT DISTINCT (user_id, group_id, symbol);

-- Create default watchlist group for all existing users
INSERT INTO watchlist_groups (user_id, name, description, is_default)
SELECT
    id AS user_id,
    'Default Watchlist' AS name,
    'Your main watchlist' AS description,
    true AS is_default
FROM users
ON CONFLICT (user_id, name) DO NOTHING;

-- Assign all existing watchlist items to their user's default group
UPDATE watchlist w
SET group_id = (
    SELECT wg.id
    FROM watchlist_groups wg
    WHERE wg.user_id = w.user_id
    AND wg.is_default = true
    LIMIT 1
)
WHERE w.group_id IS NULL;

-- Comments for documentation
COMMENT ON TABLE watchlist_groups IS 'User-defined watchlist groups for organizing symbols';
COMMENT ON COLUMN watchlist_groups.is_default IS 'Whether this is the user''s default watchlist group';
COMMENT ON COLUMN watchlist.group_id IS 'References watchlist_groups.id - allows organizing symbols into groups';
