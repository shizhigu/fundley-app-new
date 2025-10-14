import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';

const AGENTSOS_API_URL = process.env.AGENTSOS_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, sessionState } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('🔍 Calling screener agent:', AGENTSOS_API_URL);

    // Prepare request parameters
    const requestParams: Record<string, string> = {
      message: query,
      session_id: 'screener_session',  // Fixed session ID for screener
      user_id: session.user.id,        // Current user ID
      stream: 'false',
    };

    // Add session_state if provided (contains custom formulas)
    if (sessionState && Object.keys(sessionState).length > 0) {
      requestParams.session_state = JSON.stringify(sessionState);
      console.log('📊 Adding session_state with custom formulas:', Object.keys(sessionState));
    }

    // Call the screener agent via AgentOS (same way as main agent)
    const response = await fetch(
      `${AGENTSOS_API_URL}/agents/screener-agent/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestParams).toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Screener agent error:', errorText);
      return NextResponse.json(
        { error: 'Failed to execute screener query' },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Parse the content field if it's a JSON string
    let parsedContent;
    if (result.content && typeof result.content === 'string') {
      try {
        parsedContent = JSON.parse(result.content);
      } catch (e) {
        console.error('Failed to parse content as JSON:', e);
        return NextResponse.json({
          success: false,
          sql: '',
          explanation: '',
          error: 'Invalid response format from agent'
        });
      }
    } else if (result.content && typeof result.content === 'object') {
      parsedContent = result.content;
    } else {
      return NextResponse.json({
        success: false,
        sql: '',
        explanation: '',
        error: 'No content in agent response'
      });
    }

    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error('❌ Screener API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
