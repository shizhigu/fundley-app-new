-- Migration 031: Add auto-archival support for data_apps
-- Purpose: Enable automatic archival of stopped Fly.io apps to free up app slots
-- Architecture: Soft delete - preserve DB records, delete Fly.io app, keep source code
-- Created: 2025-11-07

-- Add 'archived' status to deployment_status enum
ALTER TABLE data_apps
  DROP CONSTRAINT IF EXISTS data_apps_deployment_status_check;

ALTER TABLE data_apps
  ADD CONSTRAINT data_apps_deployment_status_check
  CHECK (deployment_status IN ('deploying', 'deployed', 'archived', 'failed'));

-- Add archival tracking fields
ALTER TABLE data_apps
  ADD COLUMN archived_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN fly_app_deleted BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of apps needing archival
CREATE INDEX idx_data_apps_deployed_not_archived
  ON data_apps(deployment_status, updated_at)
  WHERE deployment_status = 'deployed' AND fly_app_deleted = FALSE;

-- Comments
COMMENT ON COLUMN data_apps.archived_at IS
  'Timestamp when the app was automatically archived (Fly.io app deleted but DB record preserved)';

COMMENT ON COLUMN data_apps.fly_app_deleted IS
  'Whether the Fly.io app has been deleted (true = only DB record remains, source code preserved on dev machine)';

COMMENT ON INDEX idx_data_apps_deployed_not_archived IS
  'Efficiently find deployed apps that haven''t been archived yet (for auto-archival background task)';

-- Update existing apps to have fly_app_deleted = false (they still exist on Fly.io)
UPDATE data_apps
SET fly_app_deleted = FALSE
WHERE fly_app_deleted IS NULL;
