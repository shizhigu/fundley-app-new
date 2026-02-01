-- Add ROE and ROA metrics for all users
-- ROE = Net Income / Average Stockholders' Equity
-- ROA = Net Income / Average Total Assets

-- Insert ROE for all users (skip if already exists for that user)
INSERT INTO latex_metrics (id, user_id, name, description, latex_code, formula, metric_type, is_active, created_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  'ROE',
  'Return on Equity - 净利润除以平均股东权益（当期与上期平均值）',
  'ROE = \frac{Net\ Income}{\frac{Equity_t + Equity_{t-1}}{2}}',
  '{
    "sql": "CAST(netincomeaccounting AS NUMERIC) / NULLIF((CAST(totalstockholdersequity AS NUMERIC) + LAG(CAST(totalstockholdersequity AS NUMERIC), 1) OVER (ORDER BY fiscalyear, CASE period WHEN ''Q1'' THEN 1 WHEN ''Q2'' THEN 2 WHEN ''Q3'' THEN 3 WHEN ''Q4'' THEN 4 END)) / 2, 0) AS ROE",
    "category": "profitability"
  }'::jsonb,
  'ratio',
  true,
  u.id,
  NOW(),
  NOW()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM latex_metrics lm
  WHERE lm.user_id = u.id AND lm.name = 'ROE'
);

-- Insert ROA for all users (skip if already exists for that user)
INSERT INTO latex_metrics (id, user_id, name, description, latex_code, formula, metric_type, is_active, created_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  'ROA',
  'Return on Assets - 净利润除以平均总资产（当期与上期平均值）',
  'ROA = \frac{Net\ Income}{\frac{Total\ Assets_t + Total\ Assets_{t-1}}{2}}',
  '{
    "sql": "CAST(netincomeaccounting AS NUMERIC) / NULLIF((CAST(totalassets AS NUMERIC) + LAG(CAST(totalassets AS NUMERIC), 1) OVER (ORDER BY fiscalyear, CASE period WHEN ''Q1'' THEN 1 WHEN ''Q2'' THEN 2 WHEN ''Q3'' THEN 3 WHEN ''Q4'' THEN 4 END)) / 2, 0) AS ROA",
    "category": "profitability"
  }'::jsonb,
  'ratio',
  true,
  u.id,
  NOW(),
  NOW()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM latex_metrics lm
  WHERE lm.user_id = u.id AND lm.name = 'ROA'
);
