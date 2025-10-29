-- Migration: Fix trigger function to use deliverables table
-- The trigger function was still referencing analysis_blocks

-- Drop and recreate the function with correct table name
CREATE OR REPLACE FUNCTION update_block_timestamp_on_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the deliverables.updated_at to the modification time
  UPDATE deliverables
  SET updated_at = NEW.modified_at
  WHERE id = NEW.deliverable_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
