-- Add metric_type field to latex_metrics table
-- This field indicates whether the metric is a ratio/percentage or a monetary amount
-- Important for YoY/QoQ calculations:
-- - ratio: use percentage point change (new - old)
-- - amount: use percentage change ((new - old) / old * 100)

ALTER TABLE latex_metrics
ADD COLUMN IF NOT EXISTS metric_type VARCHAR(20) DEFAULT 'ratio' CHECK (metric_type IN ('ratio', 'amount'));

-- Add comment to document the field
COMMENT ON COLUMN latex_metrics.metric_type IS 'Type of metric: ratio (percentage/ratio values) or amount (monetary values). Affects YoY/QoQ calculation method.';
