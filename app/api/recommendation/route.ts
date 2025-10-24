import { auth } from '@/lib/auth/clerk';
import { NextRequest, NextResponse } from 'next/server';

const AGENTSOS_API_URL =
  process.env.AGENTSOS_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, sessionState, chatId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Prepare request parameters (same as main chat agent)
    const requestParams: Record<string, string> = {
      message,
      session_id: chatId || 'autocomplete_session',
      user_id: session.user.id,
      stream: 'false',
    };

    // Add session_state if provided (contains current blocks, symbols, etc.)
    if (sessionState && Object.keys(sessionState).length > 0) {
      requestParams.session_state = JSON.stringify(sessionState);
    }

    // Call the recommendation agent via AgentOS
    const response = await fetch(
      `${AGENTSOS_API_URL}/agents/recommendation-agent/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestParams).toString(),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Recommendation agent error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get recommendations' },
        { status: response.status },
      );
    }

    const result = await response.json();

    // Return the raw content (plain text: "title | prompt" per line)
    return NextResponse.json({ content: result.content || '' });
  } catch (error) {
    console.error('❌ Recommendation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
