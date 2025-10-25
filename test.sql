WITH watchlist_symbols AS (
    SELECT * FROM (VALUES
        {{WATCHLIST_SYMBOLS}}
    ) AS t(symbol)
),
latest_dates AS (
    SELECT
        e.symbol,
        MAX(e.date) AS latest_date
    FROM eod_data e
    JOIN watchlist_symbols w ON e.symbol = w.symbol
    GROUP BY e.symbol
),
latest_prices AS (
    SELECT
        e.symbol,
        e.close AS close_price,
        e.date AS price_date
    FROM eod_data e
    JOIN latest_dates ld ON e.symbol = ld.symbol AND e.date = ld.latest_date
),
price_26w AS (
    SELECT
        e.symbol,
        MAX(e.high) AS high_26w
    FROM eod_data e
    JOIN latest_dates ld ON e.symbol = ld.symbol
    WHERE e.date >= ld.latest_date - INTERVAL '182 days'
    GROUP BY e.symbol
),
normalized AS (
    SELECT
        TRIM(fs.symbol) AS symbol,
        fs.fiscalyear,
        fs.period,
        CASE fs.period
            WHEN 'Q1' THEN 1
            WHEN 'Q2' THEN 2
            WHEN 'Q3' THEN 3
            WHEN 'Q4' THEN 4
            ELSE NULL
        END AS quarter_order,
        fs.ebit,
        fs.totalassets,
        fs.totalcurrentliabilities
    FROM financial_statements fs
    JOIN watchlist_symbols w ON TRIM(fs.symbol) = w.symbol
    WHERE fs.period IN ('Q1', 'Q2', 'Q3', 'Q4')
      AND fs.ebit IS NOT NULL
      AND fs.totalassets IS NOT NULL
      AND fs.totalcurrentliabilities IS NOT NULL
),
fs_roce AS (
    SELECT
        symbol,
        fiscalyear,
        period,
        quarter_order,
        (ebit * 100 / NULLIF(
            ((totalassets + LAG(totalassets, 1) OVER (PARTITION BY symbol ORDER BY fiscalyear, quarter_order)) / 2.0)
            - ((totalcurrentliabilities + LAG(totalcurrentliabilities, 1) OVER (PARTITION BY symbol ORDER BY fiscalyear, quarter_order)) / 2.0)
        , 0))::NUMERIC AS roce_value
    FROM normalized
    WHERE quarter_order IS NOT NULL
),
recent AS (
    SELECT
        symbol,
        fiscalyear,
        period,
        quarter_order,
        roce_value,
        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY fiscalyear DESC, quarter_order DESC) AS quarter_rank
    FROM fs_roce
),
latest_roce AS (
    SELECT
        symbol,
        CONCAT(fiscalyear, '年', period) AS latest_quarter,
        roce_value
    FROM recent
    WHERE quarter_rank = 1
),
ttm_roce AS (
    SELECT
        symbol,
        SUM(roce_value) AS sum_roce,
        COUNT(*) AS quarter_count
    FROM recent
    WHERE quarter_rank <= 4
    GROUP BY symbol
),
company_data AS (
    SELECT
        TRIM(cp.symbol) AS symbol,
        cp.companyname,
        cp.marketcap,
        cp.industry
    FROM company_profiles cp
    JOIN watchlist_symbols w ON TRIM(cp.symbol) = w.symbol
),
atm_put_options AS (
    SELECT
        oe.underlying_symbol AS symbol,
        oe.expiration_date,
        oe.strike_price,
        oe.close AS option_premium,
        lp.close_price AS stock_price,
        ABS(DATE_DIFF('day', CURRENT_DATE, CAST(oe.expiration_date AS DATE)) - 30) AS days_diff_from_30,
        ABS(oe.strike_price - lp.close_price) AS strike_diff,
        ROW_NUMBER() OVER (
            PARTITION BY oe.underlying_symbol
            ORDER BY
                ABS(DATE_DIFF('day', CURRENT_DATE, CAST(oe.expiration_date AS DATE)) - 30),
                ABS(oe.strike_price - lp.close_price)
        ) AS option_rank
    FROM options_eod_data oe
    JOIN latest_prices lp ON oe.underlying_symbol = lp.symbol
    JOIN watchlist_symbols w ON oe.underlying_symbol = w.symbol
    WHERE oe.option_type = 'put'
      AND CAST(oe.expiration_date AS DATE) > CURRENT_DATE
      AND CAST(oe.expiration_date AS DATE) <= CURRENT_DATE + INTERVAL 60 DAY
),
selected_options AS (
    SELECT
        symbol,
        expiration_date,
        strike_price,
        option_premium,
        stock_price,
        ROUND((option_premium / NULLIF(strike_price, 0)) * 100, 2) AS premium_pct
    FROM atm_put_options
    WHERE option_rank = 1
)
SELECT
    w.symbol AS "股票代码",
    cd.companyname AS "公司名称",
    ROUND(cd.marketcap, 2) AS "市值(美元)",
    ROUND(lp.close_price, 2) AS "前一日收盘价(美元)",
    ROUND(p26.high_26w, 2) AS "26周内最高价(美元)",
    CASE
        WHEN p26.high_26w IS NULL OR p26.high_26w = 0 THEN NULL
        ELSE CONCAT(ROUND(lp.close_price * 100.0 / p26.high_26w, 1), '%')
    END AS "收盘价/26周高点",
    ROUND(lr.roce_value, 1) AS "最新季度ROCE(%)",
    CASE WHEN tr.quarter_count = 4 THEN ROUND(tr.sum_roce, 1) ELSE NULL END AS "ROCE TTM(%)",
    so.expiration_date AS "Put期权到期日",
    ROUND(so.strike_price, 2) AS "Put行权价(美元)",
    ROUND(so.option_premium, 2) AS "Put权利金(美元)",
    so.premium_pct AS "权利金/行权价(%)"
FROM watchlist_symbols w
LEFT JOIN company_data cd ON w.symbol = cd.symbol
LEFT JOIN latest_prices lp ON w.symbol = lp.symbol
LEFT JOIN price_26w p26 ON w.symbol = p26.symbol
LEFT JOIN latest_roce lr ON w.symbol = lr.symbol
LEFT JOIN ttm_roce tr ON w.symbol = tr.symbol
LEFT JOIN selected_options so ON w.symbol = so.symbol
ORDER BY w.symbol;  