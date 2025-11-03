-- Migration: Add agent_tier column to credit_transactions
-- Purpose: Track which agent tier (premium/budget) was used for each transaction
-- Date: 2025-11-02

-- Add agent_tier column with default 'premium' for existing records
ALTER TABLE credit_transactions
ADD COLUMN agent_tier VARCHAR(20) DEFAULT 'premium';

-- Create index for efficient filtering by agent tier
CREATE INDEX idx_credit_transactions_agent_tier
ON credit_transactions(agent_tier);

-- Add comment for documentation
COMMENT ON COLUMN credit_transactions.agent_tier IS 'Agent tier used: premium (grok-2) or budget (grok-4-fast)';
