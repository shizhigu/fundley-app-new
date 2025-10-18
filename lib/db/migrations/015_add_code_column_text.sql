-- Migration: Add code column as JSONB
-- Created: 2025-10-18
-- Description: Support both multi-script and notebook templates using JSONB

-- Drop the TEXT column if it exists
ALTER TABLE analysis_templates DROP COLUMN IF EXISTS code;

-- Add code column as JSONB (native JSON support with indexing)
ALTER TABLE analysis_templates
ADD COLUMN code JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Update comment
COMMENT ON COLUMN analysis_templates.code IS 'Template code storage (JSONB):
- Format: {"type": "multi_script", "scripts": {"00_params.py": "...", "01_fetch.py": "...", ...}}
- Only multi_script format is supported
- JSONB allows efficient querying and indexing on template type';

-- Add index on type field for faster filtering
CREATE INDEX IF NOT EXISTS idx_analysis_templates_code_type
ON analysis_templates ((code->>'type'));
