-- Migration: Create analysis_templates table
-- Created: 2025-10-10
-- Description: Store validated, reusable analysis workflows (user-facing: "templates")
-- User Perspective: "Save this NVDA analysis so I can reuse it for TSLA later"
-- Technical Reality: Store proven analysis implementations with comprehensive documentation

CREATE TABLE IF NOT EXISTS analysis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Owner of the template
  template_name TEXT NOT NULL,  -- Internal filename (e.g., "nvda_revenue_analysis.py")
  title TEXT NOT NULL,  -- User-friendly title (e.g., "Revenue Trend Analysis")
  description TEXT,  -- What this analysis does and when to use it
  category TEXT,  -- Template type (e.g., "financial_report", "market_analysis", "valuation")
  code TEXT NOT NULL,  -- Internal: Analysis implementation with documentation
  parameters JSONB,  -- Adaptable elements (company, dates, metrics)
  data_requirements JSONB,  -- Required data sources and fields
  metadata JSONB DEFAULT '{}'::jsonb,  -- Quality score, complexity, original context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient template search
CREATE INDEX IF NOT EXISTS idx_analysis_templates_user_id ON analysis_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_templates_category ON analysis_templates(category);
CREATE INDEX IF NOT EXISTS idx_analysis_templates_created_at ON analysis_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_templates_title ON analysis_templates USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_analysis_templates_description ON analysis_templates USING gin(to_tsvector('english', description));

-- Comments (using user-friendly language)
COMMENT ON TABLE analysis_templates IS 'Reusable analysis workflows (user-facing: templates) - proven approaches users can adapt for similar analyses';
COMMENT ON COLUMN analysis_templates.code IS 'Internal implementation - NEVER exposed to users, only adapted and executed';
COMMENT ON COLUMN analysis_templates.title IS 'User-friendly name (e.g., "Revenue Growth Analysis" not "revenue_script.py")';
COMMENT ON COLUMN analysis_templates.parameters IS 'What can be adapted: company symbols, date ranges, metrics';
COMMENT ON COLUMN analysis_templates.data_requirements IS 'Data sources needed to run this analysis';
