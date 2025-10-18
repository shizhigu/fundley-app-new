-- Migration: Support multi-script templates (backward compatible)
-- Created: 2025-10-18
-- Description: Migrate analysis_templates.code from TEXT to JSONB to support both notebook and multi-script formats
-- SAFE MIGRATION: Zero data loss, fully reversible

-- ============================================
-- Phase 1: Backup and Add New Column
-- ============================================

-- Add temporary backup column (safety net)
ALTER TABLE analysis_templates
ADD COLUMN IF NOT EXISTS code_backup TEXT;

-- Backup existing data
UPDATE analysis_templates
SET code_backup = code
WHERE code_backup IS NULL;

-- Add new JSONB column
ALTER TABLE analysis_templates
ADD COLUMN IF NOT EXISTS code_new JSONB;

-- ============================================
-- Phase 2: Migrate Data (Notebook → JSONB)
-- ============================================

-- Convert existing TEXT notebook JSON to new JSONB format
-- Wraps notebook JSON as: {type: "notebook", content: <notebook_obj>}
UPDATE analysis_templates
SET code_new = jsonb_build_object(
  'type', 'notebook',
  'content', code::jsonb  -- Parse TEXT as JSONB, then wrap it
)
WHERE code_new IS NULL
  AND code IS NOT NULL
  AND code != '';

-- ============================================
-- Phase 3: Validation (Ensure No Data Loss)
-- ============================================

-- Count records with valid migration
DO $$
DECLARE
  total_records INTEGER;
  migrated_records INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM analysis_templates WHERE code IS NOT NULL;
  SELECT COUNT(*) INTO migrated_records FROM analysis_templates WHERE code_new IS NOT NULL;

  IF total_records != migrated_records THEN
    RAISE EXCEPTION 'Migration validation failed: % total records, but only % migrated', total_records, migrated_records;
  ELSE
    RAISE NOTICE 'Migration validation passed: % records successfully migrated', migrated_records;
  END IF;
END $$;

-- ============================================
-- Phase 4: Swap Columns (Atomic)
-- ============================================

-- Drop old code column (data is safe in code_new and code_backup)
ALTER TABLE analysis_templates DROP COLUMN code;

-- Rename code_new to code
ALTER TABLE analysis_templates RENAME COLUMN code_new TO code;

-- Make code column NOT NULL
ALTER TABLE analysis_templates ALTER COLUMN code SET NOT NULL;

-- ============================================
-- Phase 5: Cleanup (Optional - Keep Backup)
-- ============================================

-- OPTIONAL: Drop backup after verifying everything works
-- Uncomment the line below ONLY after thorough testing
-- ALTER TABLE analysis_templates DROP COLUMN code_backup;

-- ============================================
-- Phase 6: Update Comments
-- ============================================

COMMENT ON COLUMN analysis_templates.code IS 'Multi-format template storage (JSONB):
- New format: {type: "multi_script", scripts: {filename: content}}
- Legacy format: {type: "notebook", content: notebook_json}
All formats are backward compatible.';

COMMENT ON COLUMN analysis_templates.code_backup IS 'Backup of original TEXT code (for rollback). Safe to drop after validation.';

-- ============================================
-- Rollback Instructions (if needed)
-- ============================================

-- To rollback this migration:
-- 1. ALTER TABLE analysis_templates ADD COLUMN code_text TEXT;
-- 2. UPDATE analysis_templates SET code_text = code_backup;
-- 3. ALTER TABLE analysis_templates DROP COLUMN code;
-- 4. ALTER TABLE analysis_templates RENAME COLUMN code_text TO code;
-- 5. ALTER TABLE analysis_templates DROP COLUMN code_backup;
