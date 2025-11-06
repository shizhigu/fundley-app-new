-- Create data_apps table for Next.js dashboards deployed to Vercel
CREATE TABLE IF NOT EXISTS data_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  github_repo TEXT,
  deployment_status TEXT DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deploying', 'ready', 'failed')),
  code JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_user_slug UNIQUE(user_id, slug)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_data_apps_user_id ON data_apps(user_id);

-- Create index for deployment status queries
CREATE INDEX IF NOT EXISTS idx_data_apps_status ON data_apps(deployment_status);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_data_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_data_apps_updated_at
  BEFORE UPDATE ON data_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_data_apps_updated_at();

-- Add comments for documentation
COMMENT ON TABLE data_apps IS 'Stores metadata for user-created Next.js dashboards deployed to Vercel';
COMMENT ON COLUMN data_apps.slug IS 'URL-safe identifier (e.g., nvda-monitor) used in page path';
COMMENT ON COLUMN data_apps.url IS 'Full public URL (e.g., https://dashboards-user123.vercel.app/nvda-monitor)';
COMMENT ON COLUMN data_apps.github_repo IS 'GitHub repository full name (e.g., fundley-io/dashboards-user123)';
COMMENT ON COLUMN data_apps.code IS 'Generated code: {page: string, api: string, components?: object}';
COMMENT ON COLUMN data_apps.deployment_status IS 'Current deployment status: pending, deploying, ready, or failed';
