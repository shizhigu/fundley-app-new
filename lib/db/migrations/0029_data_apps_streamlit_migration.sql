-- Migrate data_apps table from Next.js to Streamlit
-- Streamlit apps don't need to store code in database (code lives in /workspace/{slug}/)

-- 1. Make code column nullable (Streamlit doesn't use it)
ALTER TABLE data_apps
ALTER COLUMN code DROP NOT NULL;

-- 2. Make github_repo nullable (direct Fly.io deployment, no GitHub needed)
ALTER TABLE data_apps
ALTER COLUMN github_repo DROP NOT NULL;

-- 3. Update deployment_status values to include 'initialized'
ALTER TABLE data_apps
DROP CONSTRAINT IF EXISTS data_apps_deployment_status_check;

ALTER TABLE data_apps
ADD CONSTRAINT data_apps_deployment_status_check
CHECK (deployment_status IN ('initialized', 'pending', 'deploying', 'deployed', 'ready', 'failed'));

-- 4. Update comments to reflect new architecture
COMMENT ON TABLE data_apps IS 'Stores metadata for user-created Streamlit data apps deployed to Fly.io';
COMMENT ON COLUMN data_apps.slug IS 'URL-safe identifier (e.g., nvda-monitor) used in Fly.io app name';
COMMENT ON COLUMN data_apps.url IS 'Full public URL (e.g., https://nvda-monitor-a1b2c3d4.fly.dev)';
COMMENT ON COLUMN data_apps.github_repo IS 'Legacy field (unused for Streamlit apps)';
COMMENT ON COLUMN data_apps.code IS 'Legacy field (unused - Streamlit code lives in /workspace/{slug}/)';
COMMENT ON COLUMN data_apps.deployment_status IS 'Current status: initialized, deploying, deployed, or failed';
