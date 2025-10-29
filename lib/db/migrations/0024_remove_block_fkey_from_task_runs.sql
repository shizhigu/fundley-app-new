-- Migration 024: Remove foreign key constraint from scheduled_task_runs.created_block_id
-- Purpose: Allow analysis_blocks to be deleted freely without affecting task run history
-- Reason: Task runs should preserve historical record even if the block is deleted
-- Created: 2025-10-28

-- ==========================================
-- Remove foreign key constraint
-- ==========================================

-- The created_block_id field remains as a historical reference (soft reference)
-- but no longer enforces referential integrity. This allows:
-- 1. Users to delete blocks without cascading to task run history
-- 2. Task run history to be preserved independently of blocks
-- 3. Frontend to show "Block deleted" if the UUID no longer exists

ALTER TABLE scheduled_task_runs
DROP CONSTRAINT IF EXISTS scheduled_task_runs_created_block_id_fkey;

-- The column stays (UUID type), just no longer enforced
-- Frontend should handle cases where created_block_id points to a deleted block

COMMENT ON COLUMN scheduled_task_runs.created_block_id IS
'UUID of the block created by this task run (soft reference - block may be deleted)';
