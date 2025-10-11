-- Migration: Add organization sharing to analysis_templates
-- Created: 2025-10-11
-- Description: Add organization_id and is_public columns for team collaboration

-- Step 1: Add new columns
-- organization_id is UUID to match organizations table
ALTER TABLE analysis_templates
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Step 2: Create function to auto-populate organization_id from user_id
-- This function looks up the user's organization_id (UUID) from users table
CREATE OR REPLACE FUNCTION get_organization_id_for_template(p_user_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization_id (UUID) from users table
  -- p_user_id can be either UUID (users.id) or TEXT (clerk_user_id)
  SELECT organization_id INTO v_org_id
  FROM users
  WHERE id::TEXT = p_user_id OR clerk_user_id = p_user_id
  LIMIT 1;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger function to auto-populate organization_id on INSERT
CREATE OR REPLACE FUNCTION auto_populate_template_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set organization_id if it's NULL (not already set)
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_organization_id_for_template(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger that runs before INSERT
DROP TRIGGER IF EXISTS trigger_auto_populate_template_organization ON analysis_templates;

CREATE TRIGGER trigger_auto_populate_template_organization
  BEFORE INSERT ON analysis_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_template_organization();

-- Step 5: Backfill organization_id for existing templates
UPDATE analysis_templates
SET organization_id = get_organization_id_for_template(user_id)
WHERE organization_id IS NULL;

-- Step 6: Create index for efficient organization-wide queries
CREATE INDEX IF NOT EXISTS idx_analysis_templates_organization_id
  ON analysis_templates(organization_id);

CREATE INDEX IF NOT EXISTS idx_analysis_templates_public
  ON analysis_templates(is_public)
  WHERE is_public = TRUE;

-- Step 7: Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_analysis_templates_org_public
  ON analysis_templates(organization_id, is_public);

-- Comments
COMMENT ON COLUMN analysis_templates.organization_id IS 'Organization UUID from users.organization_id, auto-populated via trigger';
COMMENT ON COLUMN analysis_templates.is_public IS 'Whether template is shared with organization (default: false/private)';
COMMENT ON FUNCTION get_organization_id_for_template IS 'Helper function to lookup organization_id (UUID) from users table';
COMMENT ON FUNCTION auto_populate_template_organization IS 'Trigger function to auto-set organization_id on template creation';
