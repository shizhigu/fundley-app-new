import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  SimplifiedFinancialEngine,
  type MetricDefinition,
  type CalculationRequest
} from '@/lib/financial/simplified-engine';

/**
 * Simplified Financial Metrics JSON AST Calculation API
 * 
 * 核心思路：
 * 1. 从AST中提取数据需求（表、字段、期间）
 * 2. 批量获取原始数据
 * 3. 递归计算AST节点
 * 4. 并发处理多个symbols
 */

// API Route Handlers
export const runtime = 'nodejs';  // 使用Node.js运行时而不是Edge Runtime
export const maxDuration = 60;    // 增加超时时间

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    const authHeader = request.headers.get('Authorization');
    const isTestMode = authHeader === 'Bearer test-token' && process.env.NODE_ENV === 'development';
    
    if (!userId && !isTestMode) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CalculationRequest = await request.json();
    const { metricDefinition, symbols, periods = 5, periodType = 'quarter', asOf } = body;

    console.log(`📨 Simplified API Request:`, {
      metric: metricDefinition.name,
      symbols: symbols.length,
      periods,
      periodType
    });

    // Validate request
    if (!metricDefinition || !metricDefinition.ast) {
      return NextResponse.json(
        { error: 'Invalid metric definition: AST is required' },
        { status: 400 }
      );
    }

    if (!symbols || symbols.length === 0) {
      return NextResponse.json(
        { error: 'At least one symbol is required' },
        { status: 400 }
      );
    }

    // Create engine and calculate
    const engine = new SimplifiedFinancialEngine();
    const result = await engine.calculateMetric({
      metricDefinition,
      symbols,
      periods,
      periodType,
      asOf
    });

    console.log(`✅ Simplified API Response completed`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Simplified API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        calculation_engine: 'SimplifiedFinancial_v1.0'
      },
      { status: 500 }
    );
  }
}