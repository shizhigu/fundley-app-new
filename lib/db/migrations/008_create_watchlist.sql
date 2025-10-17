-- Migration: Create watchlist table
-- Description: User watchlist management for tracking stocks, crypto, and options
-- Date: 2025-01-15

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255),  -- Company/asset name (cached for display)
    asset_type VARCHAR(20) DEFAULT 'stock' CHECK (asset_type IN ('stock', 'crypto', 'option')),
    added_at TIMESTAMP DEFAULT NOW(),

    -- Extended features
    notes TEXT,  -- User notes/memo
    tags JSONB DEFAULT '[]'::jsonb,  -- ["growth", "tech", "dividend"] for grouping
    alert_price_high DECIMAL(12, 2),  -- Price alert (high threshold)
    alert_price_low DECIMAL(12, 2),   -- Price alert (low threshold)
    position_size DECIMAL(12, 2),  -- Position size if tracking holdings

    -- Ensure user cannot add duplicate symbols
    UNIQUE(user_id, symbol)
);

-- Indexes for efficient queries
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_symbol ON watchlist(symbol);
CREATE INDEX idx_watchlist_user_added ON watchlist(user_id, added_at DESC);
CREATE INDEX idx_watchlist_tags ON watchlist USING GIN(tags);

-- Comments for documentation
COMMENT ON TABLE watchlist IS 'User watchlist for tracking stocks, crypto, and options';
COMMENT ON COLUMN watchlist.user_id IS 'References users.id (NOT clerk_user_id)';
COMMENT ON COLUMN watchlist.symbol IS 'Stock ticker (AAPL), crypto (BTCUSD), or option symbol';
COMMENT ON COLUMN watchlist.tags IS 'User-defined tags for grouping and filtering';
COMMENT ON COLUMN watchlist.alert_price_high IS 'Trigger alert when price goes above this value';
COMMENT ON COLUMN watchlist.alert_price_low IS 'Trigger alert when price goes below this value';
