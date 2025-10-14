import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const AGENTSOS_API_URL = process.env.AGENTSOS_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sql } = await request.json();

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Executing SQL via /query API');

    // Call AgentOS /query endpoint
    const response = await fetch(`${AGENTSOS_API_URL}/api/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Query API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to execute query', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Query route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
