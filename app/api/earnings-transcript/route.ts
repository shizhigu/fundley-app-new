import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/earnings-transcript
 *
 * Two modes:
 * 1. Get available dates: ?symbol=AAPL (no year/quarter)
 * 2. Get transcript content: ?symbol=AAPL&year=2024&quarter=4
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const year = searchParams.get('year');
    const quarter = searchParams.get('quarter');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const fmpApiKey = process.env.FMP_API_KEY;
    if (!fmpApiKey) {
      return NextResponse.json(
        { error: 'FMP API key not configured' },
        { status: 500 }
      );
    }

    // Mode 1: Get available transcript dates
    if (!year || !quarter) {
      const response = await fetch(
        `https://financialmodelingprep.com/stable/earning-call-transcript-dates?symbol=${symbol.toUpperCase()}&apikey=${fmpApiKey}`
      );

      if (!response.ok) {
        console.error(
          'FMP Transcript Dates API error:',
          response.status,
          response.statusText
        );
        return NextResponse.json(
          { error: 'Failed to fetch transcript dates' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json({ dates: data || [] });
    }

    // Mode 2: Get transcript content
    const response = await fetch(
      `https://financialmodelingprep.com/stable/earning-call-transcript?symbol=${symbol.toUpperCase()}&year=${year}&quarter=${quarter}&apikey=${fmpApiKey}`
    );

    if (!response.ok) {
      console.error(
        'FMP Earnings Transcript API error:',
        response.status,
        response.statusText
      );
      return NextResponse.json(
        { error: 'Failed to fetch earnings transcript' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // FMP returns an array, get the first item
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No transcript available for this period' },
        { status: 404 }
      );
    }

    const transcript = data[0];

    return NextResponse.json({
      symbol: transcript.symbol || symbol.toUpperCase(),
      quarter: transcript.quarter || Number(quarter),
      year: transcript.year || Number(year),
      date: transcript.date || null,
      content: transcript.content || '',
    });
  } catch (error) {
    console.error('Error fetching earnings transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
