-- Add invocation_id column to messages table
ALTER TABLE messages ADD COLUMN invocation_id UUID;

-- Create index for efficient invocation-based queries
CREATE INDEX idx_messages_invocation_id ON messages(invocation_id);

-- Add comment
COMMENT ON COLUMN messages.invocation_id IS 'Groups messages that belong to the same user request/response cycle';