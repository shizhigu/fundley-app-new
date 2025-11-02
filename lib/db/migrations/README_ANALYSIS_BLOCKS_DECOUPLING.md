# Analysis Blocks Decoupling - Migration 021

## Problem
`analysis_blocks` could not be deleted independently because `scheduled_task_runs` had a foreign key reference **without ON DELETE action**, causing PostgreSQL to reject deletions.

## Solution
Modified the foreign key constraint to use `ON DELETE SET NULL`, allowing analysis blocks to be deleted independently while preserving task run history.

## Database Changes

### Before (Problematic)
```sql
-- This BLOCKED deletion of analysis_blocks
scheduled_task_runs.created_block_id → analysis_blocks.id (NO ON DELETE)
```

### After (Fixed)
```sql
-- Now allows independent deletion
scheduled_task_runs.created_block_id → analysis_blocks.id (ON DELETE SET NULL)
```

## All Foreign Key References to `analysis_blocks`

| Referencing Table | Constraint | ON DELETE Action | Behavior |
|------------------|------------|------------------|----------|
| `block_artifacts` | `block_artifacts_block_id_fkey` | **CASCADE** | Deletes artifacts when block is deleted |
| `block_modification_history` | `block_modification_history_block_id_fkey` | **CASCADE** | Deletes history when block is deleted |
| `scheduled_task_runs` | `scheduled_task_runs_created_block_id_fkey` | **SET NULL** | Keeps run record but clears block reference |

## Impact

✅ **Can now safely delete analysis_blocks** without worrying about orphaned references

✅ **Task run history preserved** - when a block is deleted, the `created_block_id` becomes NULL but the run record remains for audit purposes

✅ **Artifacts cleaned up** - related artifacts and modification history are automatically deleted (CASCADE)

## Migration File
`021_decouple_analysis_blocks_from_task_runs.sql`

## Applied
2025-01-02
