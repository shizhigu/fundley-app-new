-- Migration: Rename block_id to deliverable_id in block_modification_history
-- This completes the "Analysis Block" → "Deliverable" renaming

-- Rename the column
ALTER TABLE block_modification_history
RENAME COLUMN block_id TO deliverable_id;

-- Rename the index
ALTER INDEX idx_block_modification_history_block_id
RENAME TO idx_block_modification_history_deliverable_id;

-- Note: Foreign key constraint name was already updated in previous migration
-- (block_modification_history_deliverable_id_fkey already exists)
