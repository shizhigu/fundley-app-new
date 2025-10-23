-- Migration 018: Add scheduled tasks support
-- Purpose: AI-native scheduled task system for automated analysis
-- Created: 2025-10-23

-- ==========================================
-- Table: scheduled_tasks
-- ==========================================

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Matches users.id (UUID stored as TEXT in Agno)

  -- Task configuration
  name TEXT NOT NULL,
  description TEXT,

  -- Associated template (optional)
  template_id UUID REFERENCES analysis_templates(id) ON DELETE SET NULL,

  -- Execution instruction (natural language for Agent)
  instruction TEXT NOT NULL,

  -- Cron configuration
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX idx_scheduled_tasks_active
  ON scheduled_tasks(is_active, next_run_at)
  WHERE is_active = true;

COMMENT ON TABLE scheduled_tasks IS 'AI-native scheduled tasks - users create via conversation with Agent';
COMMENT ON COLUMN scheduled_tasks.instruction IS 'Natural language instruction for Agent execution (e.g., "analyze NVDA options and email me")';
COMMENT ON COLUMN scheduled_tasks.cron_expression IS 'Standard cron format (e.g., "0 9 * * *" for daily 9am)';

-- ==========================================
-- Table: scheduled_task_runs (execution history)
-- ==========================================

CREATE TABLE IF NOT EXISTS scheduled_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,

  -- Execution result
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  created_block_id UUID REFERENCES analysis_blocks(id),

  -- Error information
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_task_runs_task_id ON scheduled_task_runs(task_id);
CREATE INDEX idx_scheduled_task_runs_created_at ON scheduled_task_runs(created_at DESC);

COMMENT ON TABLE scheduled_task_runs IS 'Execution history for scheduled tasks - tracks success/failure of each run';
