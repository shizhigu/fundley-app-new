-- Simplify data_apps table for Streamlit
-- Remove unnecessary fields from Next.js era

-- Drop unused columns
ALTER TABLE data_apps
DROP COLUMN IF EXISTS code,
DROP COLUMN IF EXISTS github_repo;

-- Simplify deployment_status (only 3 states needed)
ALTER TABLE data_apps
DROP CONSTRAINT IF EXISTS data_apps_deployment_status_check;

ALTER TABLE data_apps
ADD CONSTRAINT data_apps_deployment_status_check
CHECK (deployment_status IN ('deploying', 'deployed', 'failed'));

-- Set default
ALTER TABLE data_apps
ALTER COLUMN deployment_status SET DEFAULT 'deploying';

-- Update comments
COMMENT ON TABLE data_apps IS 'Streamlit data apps deployed to Fly.io';
COMMENT ON COLUMN data_apps.url IS 'Public URL: https://{slug}-{user_id_short}.fly.dev';
COMMENT ON COLUMN data_apps.deployment_status IS 'Status: deploying, deployed, or failed';

-- Final schema:
-- id (UUID, PK)
-- user_id (UUID, FK)
-- title (TEXT)
-- slug (TEXT) - URL identifier
-- description (TEXT, nullable)
-- url (TEXT) - Full public URL
-- deployment_status (TEXT) - deploying/deployed/failed
-- created_at (TIMESTAMP)
-- updated_at (TIMESTAMP)
