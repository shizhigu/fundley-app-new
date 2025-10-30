-- Migration 026: Add task plans and dependencies
-- Purpose: Enable multi-task planning and sequential execution
-- Created: 2025-10-29

-- ==========================================
-- Add task plan and dependency support
-- ==========================================

-- Add plan_id to group related tasks
ALTER TABLE scheduled_tasks
  ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT NULL;

-- Add dependency support (Task B depends on Task A)
ALTER TABLE scheduled_tasks
  ADD COLUMN IF NOT EXISTS depends_on_task_id UUID DEFAULT NULL;

-- Add foreign key for depends_on (soft reference, allows deletion)
ALTER TABLE scheduled_tasks
  ADD CONSTRAINT fk_depends_on_task
  FOREIGN KEY (depends_on_task_id)
  REFERENCES scheduled_tasks(id)
  ON DELETE SET NULL;

-- Index for efficient plan queries
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_plan_id
  ON scheduled_tasks(plan_id)
  WHERE plan_id IS NOT NULL;

-- Index for dependency lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_depends_on
  ON scheduled_tasks(depends_on_task_id)
  WHERE depends_on_task_id IS NOT NULL;

-- Add last_success_at to track when task completed successfully
ALTER TABLE scheduled_tasks
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comments
COMMENT ON COLUMN scheduled_tasks.plan_id IS 'Groups related tasks into a plan (e.g., "nvda_monitor_plan_uuid")';
COMMENT ON COLUMN scheduled_tasks.depends_on_task_id IS 'Task dependency - this task only runs after the referenced task completes successfully';
COMMENT ON COLUMN scheduled_tasks.last_success_at IS 'Timestamp of last successful execution (used for dependency checking)';

-- ==========================================
-- Migration complete
-- ==========================================

-- What changed:
-- ✅ scheduled_tasks.plan_id - group related tasks
-- ✅ scheduled_tasks.depends_on_task_id - task dependencies
-- ✅ scheduled_tasks.last_success_at - track successful completions
-- ✅ Indexes for efficient queries

-- Usage example:
-- Task Plan with 3 tasks:
--   Task 1: plan_id='monitor_plan_1', depends_on=NULL (runs first)
--   Task 2: plan_id='monitor_plan_1', depends_on=Task1.id (waits for Task 1)
--   Task 3: plan_id='monitor_plan_1', depends_on=Task2.id (waits for Task 2)
