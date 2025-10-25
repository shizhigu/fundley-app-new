-- Migration: Create sql_templates table
-- Description: Store user's saved SQL templates for watchlist analysis
-- Date: 2025-10-25

CREATE TABLE IF NOT EXISTS sql_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sql_query TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique template names per user
    UNIQUE(user_id, name)
);

-- Index for faster lookups by user
CREATE INDEX idx_sql_templates_user_id ON sql_templates(user_id);

-- Index for sorting by creation date
CREATE INDEX idx_sql_templates_created_at ON sql_templates(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sql_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sql_templates_updated_at
    BEFORE UPDATE ON sql_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_sql_templates_updated_at();

-- Comments
COMMENT ON TABLE sql_templates IS 'User-saved SQL templates for watchlist analysis';
COMMENT ON COLUMN sql_templates.name IS 'User-friendly template name (e.g., "ROCE + Dividends")';
COMMENT ON COLUMN sql_templates.sql_query IS 'SQL query text (may contain {{WATCHLIST_SYMBOLS}} placeholder)';
COMMENT ON COLUMN sql_templates.description IS 'Optional description of what this template analyzes';
