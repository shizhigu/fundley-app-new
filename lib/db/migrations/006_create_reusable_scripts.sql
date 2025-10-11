-- Migration: Create reusable_scripts table
-- Created: 2025-10-10
-- Description: Store validated, reusable Python scripts with metadata for future use

CREATE TABLE IF NOT EXISTS reusable_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Owner of the script
  script_name TEXT NOT NULL,  -- Original filename (e.g., "nvda_dashboard.py")
  title TEXT NOT NULL,  -- Human-readable title extracted from header comments
  description TEXT,  -- Purpose and usage description from header
  category TEXT,  -- Script category (e.g., "financial_report", "dashboard", "analysis")
  code TEXT NOT NULL,  -- Full Python script with header comments
  parameters JSONB,  -- Configurable parameters extracted from header (e.g., {"SYMBOL": "NVDA", "COMPANY_NAME": "NVIDIA"})
  data_requirements JSONB,  -- Required data sources and fields from header
  metadata JSONB DEFAULT '{}'::jsonb,  -- Additional metadata (complexity, estimated runtime, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_reusable_scripts_user_id ON reusable_scripts(user_id);
CREATE INDEX idx_reusable_scripts_category ON reusable_scripts(category);
CREATE INDEX idx_reusable_scripts_created_at ON reusable_scripts(created_at DESC);
CREATE INDEX idx_reusable_scripts_title ON reusable_scripts USING gin(to_tsvector('english', title));
CREATE INDEX idx_reusable_scripts_description ON reusable_scripts USING gin(to_tsvector('english', description));

-- Comments
COMMENT ON TABLE reusable_scripts IS 'Storage for validated, reusable Python scripts with comprehensive documentation headers';
COMMENT ON COLUMN reusable_scripts.code IS 'Full script including standardized header comments for quick reuse';
COMMENT ON COLUMN reusable_scripts.parameters IS 'Configurable parameters that users can modify for different use cases';
COMMENT ON COLUMN reusable_scripts.data_requirements IS 'Required database tables, fields, and data sources';
