import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400 });
    }

    const pythonServiceUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';

    const response = await fetch(
      `${pythonServiceUrl}/api/v1/stock-performance-compare`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch stock performance' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stock performance compare API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
