-- Add unique constraint to messageId in VisualizationCache table
ALTER TABLE "VisualizationCache" 
ADD CONSTRAINT "viz_cache_message_id_unique" UNIQUE ("messageId");