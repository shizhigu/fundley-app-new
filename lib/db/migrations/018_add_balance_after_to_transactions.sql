-- Migration 018: Add balance_after column to credit_transactions
-- Purpose: Track running balance after each transaction for better audit trail

-- ==========================================
-- 1. Add balance_after column
-- ==========================================

ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS balance_after DECIMAL(10, 4);

COMMENT ON COLUMN credit_transactions.balance_after IS 'Total available credits after this transaction (subscription + addon)';

-- ==========================================
-- 2. Create index for performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_credit_transactions_balance_after
ON credit_transactions(user_id, created_at DESC, balance_after);

-- ==========================================
-- Notes
-- ==========================================

-- The balance_after field will be populated automatically by the application
-- when recording new transactions. For existing transactions, it will remain NULL.
--
-- Future transactions will have:
-- balance_after = (subscription_credits + addon_credits) after the transaction
