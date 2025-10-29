-- Rename analysis_blocks table to deliverables
-- This reflects the new terminology: Agent delivers reports/analysis as "deliverables"

-- Step 1: Rename the table
ALTER TABLE analysis_blocks RENAME TO deliverables;

-- Step 2: Rename indexes
ALTER INDEX analysis_blocks_pkey RENAME TO deliverables_pkey;
ALTER INDEX idx_analysis_blocks_user_id RENAME TO idx_deliverables_user_id;
ALTER INDEX idx_analysis_blocks_created_at RENAME TO idx_deliverables_created_at;
ALTER INDEX idx_analysis_blocks_symbols RENAME TO idx_deliverables_symbols;
ALTER INDEX idx_analysis_blocks_tags RENAME TO idx_deliverables_tags;
ALTER INDEX idx_analysis_blocks_primary_symbol RENAME TO idx_deliverables_primary_symbol;
ALTER INDEX idx_analysis_blocks_unopened RENAME TO idx_deliverables_unopened;

-- Step 3: Rename foreign key constraints
ALTER TABLE deliverables
  RENAME CONSTRAINT analysis_blocks_user_id_fkey TO deliverables_user_id_fkey;

-- Step 4: Update referencing tables' foreign keys
-- block_modification_history table
ALTER TABLE block_modification_history
  DROP CONSTRAINT IF EXISTS block_modification_history_block_id_fkey;

ALTER TABLE block_modification_history
  ADD CONSTRAINT block_modification_history_deliverable_id_fkey
  FOREIGN KEY (block_id) REFERENCES deliverables(id) ON DELETE CASCADE;

-- scheduled_task_runs table
ALTER TABLE scheduled_task_runs
  DROP CONSTRAINT IF EXISTS scheduled_task_runs_created_block_id_fkey;

ALTER TABLE scheduled_task_runs
  ADD CONSTRAINT scheduled_task_runs_created_deliverable_id_fkey
  FOREIGN KEY (created_block_id) REFERENCES deliverables(id) ON DELETE SET NULL;

-- Step 5: Add comment
COMMENT ON TABLE deliverables IS 'Agent-generated deliverables (reports, analysis, dashboards, etc.)';
