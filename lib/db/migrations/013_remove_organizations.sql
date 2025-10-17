-- Migration: Remove organizations (multi-tenant) feature
-- Created: 2025-10-17
-- Description: Remove all organization-related tables and columns, simplify to single-user model

-- ============================================
-- Phase 1: Analysis Templates
-- ============================================

-- Drop organization-related triggers and functions
DROP TRIGGER IF EXISTS trigger_auto_populate_template_organization ON analysis_templates;
DROP FUNCTION IF EXISTS auto_populate_template_organization();
DROP FUNCTION IF EXISTS get_organization_id_for_template(TEXT);

-- Drop organization-related indexes
DROP INDEX IF EXISTS idx_analysis_templates_organization_id;
DROP INDEX IF EXISTS idx_analysis_templates_org_public;

-- Remove organization_id column
ALTER TABLE analysis_templates DROP COLUMN IF EXISTS organization_id;

-- Update comment for is_public column
COMMENT ON COLUMN analysis_templates.is_public IS 'Whether template is globally public (accessible to all users)';

-- ============================================
-- Phase 2: LaTeX Metrics
-- ============================================

-- Add user_id column if not exists
ALTER TABLE latex_metrics ADD COLUMN IF NOT EXISTS user_id UUID;

-- Migrate data: copy created_by to user_id if user_id is null
UPDATE latex_metrics
SET user_id = created_by
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Drop organization_id column
ALTER TABLE latex_metrics DROP COLUMN IF EXISTS organization_id;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_latex_metrics_user_id ON latex_metrics(user_id);

-- Update comment
COMMENT ON COLUMN latex_metrics.user_id IS 'Owner of this LaTeX metric';

-- ============================================
-- Phase 3: Users Table
-- ============================================

-- Remove organization foreign keys and columns
ALTER TABLE users DROP COLUMN IF EXISTS organization_id;
ALTER TABLE users DROP COLUMN IF EXISTS clerk_organization_id;

-- ============================================
-- Phase 4: Chats Table
-- ============================================

-- Remove organization column from chats
ALTER TABLE chats DROP COLUMN IF EXISTS organization_id;

-- ============================================
-- Phase 5: Organizations Table
-- ============================================

-- Drop the entire organizations table
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================
-- Verification
-- ============================================

-- Verify tables are clean
DO $$
BEGIN
  RAISE NOTICE '✅ Organizations removed successfully';
  RAISE NOTICE '✅ Templates: organization_id dropped, is_public retained';
  RAISE NOTICE '✅ LaTeX Metrics: migrated to user_id ownership';
  RAISE NOTICE '✅ Users: organization columns removed';
  RAISE NOTICE '✅ Chats: organization_id removed';
END $$;
