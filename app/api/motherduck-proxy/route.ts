import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface QueryRequest {
  sql: string;
}

interface QueryResponse {
  success: boolean;
  data: any[];
  row_count: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { sql }: QueryRequest = await request.json();
    
    if (!sql) {
      return NextResponse.json(
        { success: false, error: 'SQL query is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [Proxy] Forwarding MotherDuck query:', sql);
    
    // 从服务器端发起请求到 Render
    const renderUrl = process.env.MOTHERDUCK_API_URL || 'https://fundley-backend.onrender.com';
    
    const response = await fetch(`${renderUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Next.js-Proxy/1.0',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      throw new Error(`Render API returned ${response.status}: ${response.statusText}`);
    }

    const result: QueryResponse = await response.json();
    
    console.log(`✅ [Proxy] MotherDuck query completed: ${result.row_count} rows`);
    
    // 直接返回结果
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [Proxy] MotherDuck query failed:', error);
    
    return NextResponse.json({
      success: false,
      data: [],
      row_count: 0,
      error: error instanceof Error ? error.message : 'Unknown proxy error'
    }, { status: 500 });
  }
}