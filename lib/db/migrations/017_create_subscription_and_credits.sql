-- Migration 017: Create subscription and credit system
-- Purpose: Implement Stripe-based subscription with dual credit pools (subscription + addon)

-- ==========================================
-- 1. Add credit fields to users table
-- ==========================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_credits DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS addon_credits DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMP;

COMMENT ON COLUMN users.subscription_credits IS 'Monthly subscription credits (resets each billing cycle)';
COMMENT ON COLUMN users.addon_credits IS 'Purchased addon credits (never expires, accumulated)';
COMMENT ON COLUMN users.is_internal IS 'Internal staff flag for unlimited access';
COMMENT ON COLUMN users.credits_reset_at IS 'Next reset time for subscription credits';

-- ==========================================
-- 2. Create subscriptions table
-- ==========================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Stripe identifiers
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,

    -- Plan details
    plan_type TEXT NOT NULL, -- 'starter' ($99), 'pro' ($249), 'institutional' ($1,249)
    status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'incomplete', 'trialing'
    monthly_credits INTEGER NOT NULL, -- Credits included per month (50, 200, or 999999 for unlimited)

    -- Billing period
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,

    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_plan_type CHECK (plan_type IN ('starter', 'pro', 'institutional')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing', 'unpaid'))
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

COMMENT ON TABLE subscriptions IS 'Stripe subscription records for users';
COMMENT ON COLUMN subscriptions.monthly_credits IS 'Starter: 50, Pro: 200, Institutional: 999999 (unlimited)';

-- ==========================================
-- 3. Create credit_transactions table (audit log)
-- ==========================================

CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID, -- Reference to chat if applicable

    -- Transaction details
    amount DECIMAL(10, 4) NOT NULL, -- Credits consumed/added (can be negative for usage)
    transaction_type TEXT NOT NULL, -- 'usage', 'refund', 'addon_purchase', 'monthly_reset', 'manual_adjustment'
    source_type TEXT, -- 'subscription' or 'addon' (which pool was used)

    -- Token breakdown (for usage transactions)
    input_tokens INTEGER,
    output_tokens INTEGER,
    reasoning_tokens INTEGER,
    total_tokens INTEGER,

    -- Additional info
    description TEXT,
    metadata JSONB, -- Store additional data (e.g., Stripe payment intent ID)

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('usage', 'refund', 'addon_purchase', 'monthly_reset', 'manual_adjustment', 'gift')),
    CONSTRAINT valid_source_type CHECK (source_type IS NULL OR source_type IN ('subscription', 'addon'))
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_chat_id ON credit_transactions(chat_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);

COMMENT ON TABLE credit_transactions IS 'Audit log for all credit transactions';
COMMENT ON COLUMN credit_transactions.amount IS 'Negative for usage, positive for purchases/refunds';

-- ==========================================
-- 4. Create function to auto-update updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_timestamp
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_updated_at();

-- ==========================================
-- 5. Create helper function to get total available credits
-- ==========================================

CREATE OR REPLACE FUNCTION get_available_credits(p_user_id UUID)
RETURNS DECIMAL(10, 4) AS $$
DECLARE
    v_subscription_credits DECIMAL(10, 4);
    v_addon_credits DECIMAL(10, 4);
    v_is_internal BOOLEAN;
BEGIN
    SELECT subscription_credits, addon_credits, is_internal
    INTO v_subscription_credits, v_addon_credits, v_is_internal
    FROM users
    WHERE id = p_user_id;

    -- Internal users get unlimited credits
    IF v_is_internal THEN
        RETURN 999999999;
    END IF;

    -- Return total of both pools
    RETURN COALESCE(v_subscription_credits, 0) + COALESCE(v_addon_credits, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_credits IS 'Calculate total available credits (subscription + addon). Returns 999999999 for internal users.';

-- ==========================================
-- 6. Insert sample data for testing (optional)
-- ==========================================

-- Example: Set first user as internal (for testing)
-- UPDATE users SET is_internal = true, addon_credits = 999999999 WHERE email = 'your-email@example.com';

-- ==========================================
-- Notes
-- ==========================================

-- Credit conversion formula:
-- 1 Credit = $0.2
-- GPT-5 pricing: $1.25/M input tokens, $10/M output/reasoning tokens
--
-- Credit cost calculation:
-- credit_cost = (input_tokens * 1.25 + (output_tokens + reasoning_tokens) * 10) / 1_000_000 / 0.2
--             = (input_tokens * 1.25 + (output_tokens + reasoning_tokens) * 10) / 200_000
--
-- Usage pattern:
-- 1. Deduct from subscription_credits first (monthly allowance)
-- 2. If insufficient, deduct from addon_credits (permanent)
-- 3. If both exhausted, deny service (unless is_internal = true)

-- Plan mapping:
-- Starter ($99/month): 50 credits → ~10M tokens (mixed usage)
-- Pro ($249/month): 200 credits → ~40M tokens (mixed usage)
-- Institutional ($1,249/month): Unlimited (999999 credits)
