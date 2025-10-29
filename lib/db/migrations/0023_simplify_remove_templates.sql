-- Migration 023: Simplify architecture - Remove templates, enhance scheduled_tasks
-- Purpose: Remove analysis_templates abstraction, let Agent manage file system freely
-- Created: 2025-10-28
-- Philosophy: One Agent, free file organization, simpler is better

-- ==========================================
-- 1. Enhance scheduled_tasks for flexible execution
-- ==========================================

-- Remove template dependency
ALTER TABLE scheduled_tasks
  DROP CONSTRAINT IF EXISTS scheduled_tasks_template_id_fkey;

ALTER TABLE scheduled_tasks
  DROP COLUMN IF EXISTS template_id;

-- Add execution control fields
ALTER TABLE scheduled_tasks
  ADD COLUMN IF NOT EXISTS run_once BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS executed_count INTEGER DEFAULT 0;

-- Update comments
COMMENT ON COLUMN scheduled_tasks.run_once IS 'True for one-time execution (task auto-deactivates after first run)';
COMMENT ON COLUMN scheduled_tasks.run_count IS 'Maximum execution count (NULL = unlimited). Task deactivates when executed_count reaches this number.';
COMMENT ON COLUMN scheduled_tasks.executed_count IS 'Number of times this task has been executed';
COMMENT ON COLUMN scheduled_tasks.cron_expression IS 'Standard cron format (e.g., "0 9 * * *"). Can be flexible for immediate or future scheduled tasks.';

COMMENT ON TABLE scheduled_tasks IS 'AI-native scheduled tasks - supports recurring, one-time, and N-times execution patterns';

-- ==========================================
-- 2. Remove analysis_templates table
-- ==========================================

DROP TABLE IF EXISTS analysis_templates CASCADE;

COMMENT ON TABLE analysis_templates IS NULL;  -- Remove any orphaned comments

-- ==========================================
-- 3. Update analysis_blocks documentation
-- ==========================================

COMMENT ON COLUMN analysis_blocks.content IS 'JSONB content: {
  project_path: "/nvda_analysis",  -- Agent-managed project location
  status: "success",
  files: ["report.html", "data.json"],
  summary: "...",
  symbols: ["NVDA"],
  ...
}';

-- ==========================================
-- Migration complete
-- ==========================================

-- What changed:
-- ✅ scheduled_tasks now supports one-time and N-times execution
-- ✅ Removed dependency on analysis_templates
-- ✅ Deleted analysis_templates table completely
-- ✅ Agent now has full freedom to organize /tmp/fundley/{user_id}/ workspace

-- What remains:
-- ✅ chats - multiple chat sessions
-- ✅ analysis_blocks - analysis results display
-- ✅ scheduled_tasks - flexible task scheduling
-- ✅ scheduled_task_runs - execution history
