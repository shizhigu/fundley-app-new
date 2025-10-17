-- Migration: Auto-update analysis_blocks.updated_at when modification history is added
-- Created: 2025-10-17
-- Description: Create trigger to automatically update updated_at when block_modification_history is inserted

-- Create function to update block's updated_at timestamp
CREATE OR REPLACE FUNCTION update_block_timestamp_on_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the analysis_blocks.updated_at to the modification time
  UPDATE analysis_blocks
  SET updated_at = NEW.modified_at
  WHERE id = NEW.block_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on block_modification_history
DROP TRIGGER IF EXISTS trigger_update_block_on_modification ON block_modification_history;

CREATE TRIGGER trigger_update_block_on_modification
  AFTER INSERT ON block_modification_history
  FOR EACH ROW
  EXECUTE FUNCTION update_block_timestamp_on_modification();

COMMENT ON FUNCTION update_block_timestamp_on_modification() IS 'Automatically updates analysis_blocks.updated_at when a modification history record is added';
