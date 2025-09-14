import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.toUpperCase() || 'AAPL';
  const period = searchParams.get('period') || '1M';

  try {
    console.log(`📊 Fetching chart data for ${symbol}, period: ${period}`);

    // 根据时间周期确定数据范围
    const dateCondition = getDateCondition(period);

    const query = `
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
      ORDER BY date ASC
      LIMIT 1000
    `;

    console.log(`🔍 DuckDB Query: ${query}`);

    // 直接调用MotherDuck API (避免内部HTTP调用)
    const renderUrl = process.env.MOTHERDUCK_API_URL || 'https://fundley-backend.onrender.com';

    const response = await fetch(`${renderUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: query }),
    });

    if (!response.ok) {
      throw new Error(`MotherDuck API failed: ${response.status} ${response.statusText}`);
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
      adjClose: parseFloat(row.adjclose)
    }));

    console.log(`✅ Chart data prepared: ${chartData.length} points for ${symbol}`);

    return Response.json({
      success: true,
      symbol,
      period,
      data: chartData,
      count: chartData.length,
      latestPrice: chartData[chartData.length - 1]?.close || 0
    });

  } catch (error) {
    console.error('❌ Chart data fetch error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol,
        period
      },
      { status: 500 }
    );
  }
}

// 根据时间周期生成SQL WHERE条件 (只支持日线数据)
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