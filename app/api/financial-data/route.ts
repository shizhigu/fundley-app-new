import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/config';

// 财务数据请求接口
interface FinancialDataRequest {
  symbols: string[];           // ['NVDA', 'AAPL', 'MSFT']
  metricIds: string[];        // LaTeX metric IDs from PostgreSQL
  quarters: number;           // 5, 10, 20
}

// 财务数据响应接口
interface FinancialDataResponse {
  symbol: string;
  fiscalYear: number;
  period: string;
  date: string | null;
  metrics: Record<string, {
    value: number | null;
    qoq: {
      value: number | null;
      direction: 'up' | 'down';
    };
    yoy: {
      value: number | null;
      direction: 'up' | 'down';
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { symbols, metricIds, quarters }: FinancialDataRequest = await request.json();


    // 验证输入参数
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Valid symbols array is required' },
        { status: 400 }
      );
    }

    if (!metricIds || !Array.isArray(metricIds) || metricIds.length === 0) {
      return NextResponse.json(
        { error: 'Valid metricIds array is required' },
        { status: 400 }
      );
    }

    if (!quarters || quarters <= 0 || quarters > 50) {
      return NextResponse.json(
        { error: 'Quarters must be between 1 and 50' },
        { status: 400 }
      );
    }

    // 获取SQL公式
    console.log(`🔍 Fetching SQL formulas for ${metricIds.length} metrics`);
    const sqlFormulas: { [metricId: string]: string } = {};

    // 批量查询所有指标 - 修复UUID类型问题
    // Convex IDs 不是 UUID 格式，改用文本比较
    const metrics = await db`
      SELECT id::text as id, name, formula->>'sql' as sql_formula
      FROM latex_metrics
      WHERE id::text = ANY(${metricIds})
        AND is_active = true
    `;

    for (const metric of metrics) {
      if (metric.sql_formula) {
        sqlFormulas[metric.id] = metric.sql_formula;
        console.log(`✅ Found SQL formula for ${metric.name}: ${metric.sql_formula}`);
      } else {
        console.warn(`⚠️  No SQL formula found for metric: ${metric.name}`);
      }
    }

    // 检查是否有遗漏的指标
    const foundMetricIds = metrics.map(m => m.id);
    const missingMetricIds = metricIds.filter(id => !foundMetricIds.includes(id));
    if (missingMetricIds.length > 0) {
      console.warn(`⚠️  Missing metrics: ${missingMetricIds.join(', ')}`);
    }

    // 检查是否找到了任何SQL公式
    if (Object.keys(sqlFormulas).length === 0) {
      console.error(`❌ No SQL formulas found for any of the requested metrics: ${metricIds.join(', ')}`);
      return NextResponse.json(
        {
          error: 'No SQL formulas found',
          details: `None of the requested metrics (${metricIds.join(', ')}) have SQL formulas defined`,
          suggestion: 'Please ensure the metrics exist in the database and have valid SQL formulas'
        },
        { status: 400 }
      );
    }

    // 获取Python微服务URL（从环境变量）
    const pythonServiceUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8012';

    console.log(`📊 Requesting financial data from ${pythonServiceUrl}`);
    console.log(`📋 Request: ${symbols.length} symbols, ${Object.keys(sqlFormulas).length} SQL formulas, ${quarters} quarters`);

    // 调用Python微服务，传递SQL公式而不是metric IDs
    const response = await fetch(`${pythonServiceUrl}/api/v1/financial-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        symbols: symbols.map(s => s.trim().toUpperCase()),
        sqlFormulas, // 传递SQL公式映射
        quarters
      }),
    });

    if (!response.ok) {
      console.error(`❌ Python service error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`❌ Error details: ${errorText}`);

      return NextResponse.json(
        {
          error: 'Failed to fetch financial data from service',
          details: `Service returned ${response.status}: ${response.statusText}`,
          serviceError: errorText
        },
        { status: 502 }
      );
    }

    const data: FinancialDataResponse[] = await response.json();

    console.log(`✅ Received ${data.length} records from Python service`);

    // 返回处理后的数据
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Financial data API error:', error);

    // 检查是否是网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          error: 'Unable to connect to financial data service',
          details: 'Please ensure the Python microservice is running',
          suggestion: 'Check if AGENTSOS_API_URL environment variable is set correctly'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Financial Data API',
      version: '1.0.0',
      endpoints: {
        'POST /api/financial-data': 'Get financial metrics for specified symbols and periods'
      },
      usage: {
        method: 'POST',
        body: {
          symbols: ['AAPL', 'MSFT'],
          metricIds: ['metric_id_1', 'metric_id_2'],
          quarters: 5
        }
      }
    }
  );
}