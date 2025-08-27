import { auth } from '@/lib/auth/clerk';
import { saveVisualizationCache, getVisualizationCacheByMessageId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, title, code, htmlContent, imageUrl } = body;

    if (!messageId || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cache = await saveVisualizationCache({
      messageId,
      title,
      code,
      htmlContent,
      imageUrl,
    });

    return NextResponse.json(cache);
  } catch (error) {
    console.error('Error saving visualization cache:', error);
    return NextResponse.json({ error: 'Failed to save cache' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const cache = await getVisualizationCacheByMessageId(messageId);
    
    if (!cache) {
      return NextResponse.json({ cached: false });
    }

    return NextResponse.json({ cached: true, data: cache });
  } catch (error) {
    console.error('Error getting visualization cache:', error);
    return NextResponse.json({ error: 'Failed to get cache' }, { status: 500 });
  }
}