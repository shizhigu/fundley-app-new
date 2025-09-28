import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚀 [Proxy] POST request received');

  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { success: false, error: 'SQL required' },
        { status: 400 },
      );
    }

    console.log('🔄 [Proxy] SQL:', sql);

    const renderUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';

    const response = await fetch(`${renderUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [Proxy] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error',
      },
      { status: 500 },
    );
  }
}
