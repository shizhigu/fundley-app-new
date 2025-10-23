-- Add timezone field to users table
-- This stores the user's last known timezone for scheduled task execution

ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);

-- Add comment
COMMENT ON COLUMN users.timezone IS 'User timezone (IANA format, e.g., America/New_York, Asia/Shanghai). Updated on each login.';
