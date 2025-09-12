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
  console.log('🚀 [Proxy] POST request received at motherduck-proxy');
  
  try {
    console.log('📥 [Proxy] Parsing request body...');
    const { sql }: QueryRequest = await request.json();
    console.log('✅ [Proxy] Request body parsed successfully');
    
    if (!sql) {
      return NextResponse.json(
        { success: false, error: 'SQL query is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [Proxy] Forwarding MotherDuck query:', sql);
    
    // 从服务器端发起请求到 Render
    const renderUrl = process.env.MOTHERDUCK_API_URL || 'https://fundley-backend.onrender.com';
    console.log('🌐 [Proxy] Target URL:', renderUrl);
    console.log('🏃 [Proxy] Running on:', process.env.VERCEL_REGION || 'local');
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${renderUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Next.js-Proxy/1.0',
        },
        body: JSON.stringify({ sql }),
        // 添加 30 秒超时
        signal: AbortSignal.timeout(30000),
      });
      
      const duration = Date.now() - startTime;
      console.log(`⏱️ [Proxy] Request took ${duration}ms`);
      console.log('📡 [Proxy] Response status:', response.status);
      console.log('📡 [Proxy] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Render API returned ${response.status}: ${response.statusText}`);
      }

      const result: QueryResponse = await response.json();
      
      console.log(`✅ [Proxy] MotherDuck query completed: ${result.row_count} rows`);
      
      // 直接返回结果
      return NextResponse.json(result);
      
    } catch (fetchError) {
      const duration = Date.now() - startTime;
      console.error(`❌ [Proxy] Fetch failed after ${duration}ms:`, fetchError);
      throw fetchError;
    }

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