-- Migration 027: Add 'skipped' status to scheduled_task_runs
-- Purpose: Allow logging of skipped tasks when dependencies not satisfied
-- Created: 2025-10-29
-- Fixes: Design consistency issue found in review

-- ==========================================
-- Update status CHECK constraint
-- ==========================================

-- Remove old constraint (only had 'success', 'failed')
ALTER TABLE scheduled_task_runs
DROP CONSTRAINT IF EXISTS scheduled_task_runs_status_check;

-- Add new constraint including 'skipped'
ALTER TABLE scheduled_task_runs
ADD CONSTRAINT scheduled_task_runs_status_check
CHECK (status IN ('success', 'failed', 'skipped'));

-- Update comment
COMMENT ON COLUMN scheduled_task_runs.status IS
'Task execution status:
 - success: Task completed successfully (deliverable created, email sent)
 - failed: Task execution error (exception thrown, logged in error_message)
 - skipped: Task skipped because dependency not satisfied (depends_on_task_id not completed)';

-- ==========================================
-- Migration complete
-- ==========================================

-- What changed:
-- ✅ scheduled_task_runs.status now accepts 'skipped' in addition to 'success', 'failed'
-- ✅ Enables proper logging when dependent tasks are skipped due to unmet dependencies

-- Impact:
-- ✅ Fixes design consistency issue (executor was using 'skipped' but schema didn't allow it)
-- ✅ No breaking changes (existing 'success'/'failed' statuses still valid)
