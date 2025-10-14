import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.toUpperCase() || 'AAPL';
  const period = searchParams.get('period') || '1M';
  const interval = searchParams.get('interval') || 'daily'; // 新增：daily, weekly, monthly

  try {
    // 根据时间周期确定数据范围
    const dateCondition = getDateCondition(period);

    // 根据间隔类型生成查询
    const query = generateQuery(symbol, dateCondition, interval);

    // 直接调用MotherDuck API (避免内部HTTP调用)
    const renderUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';

    const response = await fetch(`${renderUrl}/api/v1/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: query }),
    });

    if (!response.ok) {
      throw new Error(
        `MotherDuck API failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Query failed: ${data.error}`);
    }

    // 转换为TradingView格式
    const chartData = data.data.map((row: any) => ({
      time: row.date, // DuckDB DATE format: YYYY-MM-DD
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      // 额外信息
      volume: parseInt(row.volume),
      adjClose: parseFloat(row.adjclose),
    }));

    return Response.json({
      success: true,
      symbol,
      period,
      data: chartData,
      count: chartData.length,
      latestPrice: chartData[chartData.length - 1]?.close || 0,
    });
  } catch (error) {
    console.error('❌ Chart data fetch error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol,
        period,
      },
      { status: 500 },
    );
  }
}

// 根据间隔类型生成查询
function generateQuery(
  symbol: string,
  dateCondition: string,
  interval: string,
): string {
  if (interval === 'daily') {
    // 日线数据 - 原有逻辑
    return `
      SELECT * FROM (
        SELECT
          symbol,
          date,
          open,
          high,
          low,
          close,
          adjclose,
          volume
        FROM eod_data
        WHERE symbol = '${symbol}'
          AND ${dateCondition}
        ORDER BY date DESC
        LIMIT 2500
      ) AS recent_data
      ORDER BY date ASC
    `;
  } else if (interval === 'weekly') {
    // 周线数据 - 按周聚合
    return `
      SELECT * FROM (
        SELECT
          symbol,
          DATE_TRUNC('week', date) as date,  -- 每周的第一天
          FIRST(open ORDER BY date) as open,  -- 周开盘价（第一天的开盘价）
          MAX(high) as high,                  -- 周最高价
          MIN(low) as low,                    -- 周最低价
          LAST(close ORDER BY date) as close, -- 周收盘价（最后一天的收盘价）
          LAST(adjclose ORDER BY date) as adjclose,
          SUM(volume) as volume               -- 周成交量（累计）
        FROM eod_data
        WHERE symbol = '${symbol}'
          AND ${dateCondition}
        GROUP BY symbol, DATE_TRUNC('week', date)
        ORDER BY date DESC
        LIMIT 500
      ) AS recent_data
      ORDER BY date ASC
    `;
  } else if (interval === 'monthly') {
    // 月线数据 - 按月聚合
    return `
      SELECT * FROM (
        SELECT
          symbol,
          DATE_TRUNC('month', date) as date,  -- 每月的第一天
          FIRST(open ORDER BY date) as open,  -- 月开盘价
          MAX(high) as high,                  -- 月最高价
          MIN(low) as low,                    -- 月最低价
          LAST(close ORDER BY date) as close, -- 月收盘价
          LAST(adjclose ORDER BY date) as adjclose,
          SUM(volume) as volume               -- 月成交量
        FROM eod_data
        WHERE symbol = '${symbol}'
          AND ${dateCondition}
        GROUP BY symbol, DATE_TRUNC('month', date)
        ORDER BY date DESC
        LIMIT 120
      ) AS recent_data
      ORDER BY date ASC
    `;
  }

  // 默认返回日线
  return generateQuery(symbol, dateCondition, 'daily');
}

// 根据时间周期生成SQL WHERE条件
function getDateCondition(period: string): string {
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  switch (period) {
    case '1W':
      return `date >= DATE '${now}' - INTERVAL 7 DAY`; // 最近7天
    case '1M':
      return `date >= DATE '${now}' - INTERVAL 1 MONTH`; // 最近1个月
    case '3M':
      return `date >= DATE '${now}' - INTERVAL 3 MONTH`; // 最近3个月
    case '6M':
      return `date >= DATE '${now}' - INTERVAL 6 MONTH`; // 最近6个月
    case '1Y':
      return `date >= DATE '${now}' - INTERVAL 1 YEAR`; // 最近1年
    case '5Y':
      return `date >= DATE '${now}' - INTERVAL 5 YEAR`; // 最近5年
    case 'ALL':
      return `date >= '1990-01-01'`; // 所有数据
    default:
      return `date >= DATE '${now}' - INTERVAL 3 MONTH`; // 默认3个月
  }
}
