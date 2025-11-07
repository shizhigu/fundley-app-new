-- Migration 026: Rename created_block_id to created_deliverable_id in scheduled_task_runs
-- Purpose: Complete the migration from analysis_blocks to deliverables terminology
-- The foreign key was renamed in migration 024 but the column itself was missed
-- Created: 2025-11-07

ALTER TABLE scheduled_task_runs
  RENAME COLUMN created_block_id TO created_deliverable_id;

COMMENT ON COLUMN scheduled_task_runs.created_deliverable_id IS
'UUID of the deliverable created by this task run (soft reference - deliverable may be deleted)';
