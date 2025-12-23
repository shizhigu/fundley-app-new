import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface CompanyMetrics {
  symbol: string;
  roce?: number;
  revenueGrowthYoY?: number;
  grossMargin?: number;
  grossMarginQoQ?: number;
  grossMarginYoY?: number;
  operatingMargin?: number;
  operatingMarginQoQ?: number;
  operatingMarginYoY?: number;
  cashConversionRate?: number;
  netIncomePositive?: boolean;
  fcfPositive?: boolean;
  fcfGrowthYoY?: number;
  fcfTurnedPositive?: boolean;
  fcfYield?: number;
  priceToHigh?: number;
}

interface CompanyCompareResponse {
  metrics: CompanyMetrics[];
}

const AGENTSOS_API_URL =
  process.env.AGENTSOS_API_URL || 'http://localhost:8000';

/**
 * POST /api/company-compare
 * Fetch and compare financial metrics for multiple companies from MotherDuck
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 symbols are required' },
        { status: 400 }
      );
    }

    // Call Python service to get metrics from MotherDuck
    const response = await fetch(`${AGENTSOS_API_URL}/api/v1/company-compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python service error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch comparison data' },
        { status: response.status }
      );
    }

    const data: CompanyCompareResponse = await response.json();

    return NextResponse.json({ metrics: data.metrics });
  } catch (error) {
    console.error('Error comparing companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
