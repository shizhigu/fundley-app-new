import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';

const AGENTSOS_API_URL = process.env.AGENTSOS_API_URL;

export async function GET(request: NextRequest) {
  try {
    // Check if AgentOS API URL is configured
    if (!AGENTSOS_API_URL) {
      console.error('AGENTSOS_API_URL environment variable is not set');
      return NextResponse.json(
        { error: 'Service configuration error', details: 'AGENTSOS_API_URL not configured' },
        { status: 500 }
      );
    }

    // Get authenticated user
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch token usage from Python backend
    const response = await fetch(
      `${AGENTSOS_API_URL}/api/v1/users/token-usage/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch token usage', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Token usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
