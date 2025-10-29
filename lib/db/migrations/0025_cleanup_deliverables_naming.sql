-- Cleanup remaining analysis_blocks references in deliverables table

-- Rename remaining indexes
ALTER INDEX IF EXISTS idx_analysis_blocks_chat_id RENAME TO idx_deliverables_chat_id;
ALTER INDEX IF EXISTS idx_analysis_blocks_pinned RENAME TO idx_deliverables_pinned;
ALTER INDEX IF EXISTS idx_analysis_blocks_source_chat RENAME TO idx_deliverables_source_chat;

-- Rename trigger
DROP TRIGGER IF EXISTS trigger_update_analysis_blocks_updated_at ON deliverables;

-- Recreate trigger with new name
CREATE OR REPLACE FUNCTION update_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deliverables_updated_at
    BEFORE UPDATE ON deliverables
    FOR EACH ROW
    EXECUTE FUNCTION update_deliverables_updated_at();

-- Drop old function if exists
DROP FUNCTION IF EXISTS update_analysis_blocks_updated_at() CASCADE;
