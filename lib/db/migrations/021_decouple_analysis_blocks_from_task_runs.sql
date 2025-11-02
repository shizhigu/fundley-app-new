-- Migration: Decouple analysis_blocks from scheduled_task_runs
-- Purpose: Allow independent deletion of analysis blocks without being blocked by task run references
-- Date: 2025-01-02

-- Drop the existing foreign key constraint
ALTER TABLE scheduled_task_runs
DROP CONSTRAINT IF EXISTS scheduled_task_runs_created_block_id_fkey;

-- Re-add the foreign key with ON DELETE SET NULL
-- This allows deleting analysis blocks - the task run record remains but created_block_id becomes NULL
ALTER TABLE scheduled_task_runs
ADD CONSTRAINT scheduled_task_runs_created_block_id_fkey
FOREIGN KEY (created_block_id)
REFERENCES analysis_blocks(id)
ON DELETE SET NULL;

-- Add a comment explaining the change
COMMENT ON CONSTRAINT scheduled_task_runs_created_block_id_fkey ON scheduled_task_runs IS
'References analysis_blocks with ON DELETE SET NULL to allow independent deletion of blocks';
