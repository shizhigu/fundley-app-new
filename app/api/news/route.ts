import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/config'

/**
 * GET /api/news
 * Fetch news for user's watchlist symbols from FMP API
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get database user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = userResult[0].id

    // Get all symbols from user's watchlist
    const watchlistResult = await db`
      SELECT DISTINCT symbol FROM watchlist
      WHERE user_id = ${userId}
      ORDER BY symbol
    `

    if (watchlistResult.length === 0) {
      return NextResponse.json({ news: [], total: 0 })
    }

    // Extract symbols
    const symbols = watchlistResult.map(row => row.symbol).join(',')

    // Prepare date range (yesterday, today, tomorrow to avoid timezone issues)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const from = yesterday.toISOString().split('T')[0]
    const to = tomorrow.toISOString().split('T')[0]

    // Fetch news from FMP API
    const fmpApiKey = process.env.FMP_API_KEY
    if (!fmpApiKey) {
      return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 })
    }

    const fmpUrl = `https://financialmodelingprep.com/stable/news/stock?apikey=${fmpApiKey}&symbols=${symbols}&from=${from}&to=${to}`

    const fmpResponse = await fetch(fmpUrl)

    if (!fmpResponse.ok) {
      console.error('FMP API error:', fmpResponse.status, fmpResponse.statusText)
      return NextResponse.json({ error: 'Failed to fetch news from FMP' }, { status: 500 })
    }

    const newsData = await fmpResponse.json()

    // Convert ET time to UTC for each article
    const newsWithUTC = (newsData || []).map((article: any) => {
      // FMP returns time in ET format: "2025-10-24 19:21:00"
      // We need to convert this to UTC ISO string for proper client-side handling
      let utcDate = article.publishedDate

      if (article.publishedDate) {
        try {
          // Parse the date string: "2025-10-24 19:21:00"
          const [datePart, timePart] = article.publishedDate.split(' ')
          const [year, month, day] = datePart.split('-').map(Number)
          const [hours, minutes, seconds = 0] = timePart.split(':').map(Number)

          // Create a reference date to determine if DST is in effect for this specific date
          // We create a date in UTC with these components
          const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

          // Format this date as it would appear in ET timezone
          const etFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            timeZoneName: 'short'
          })
          const etFormatted = etFormatter.format(refDate)

          // Check if it's EDT (daylight) or EST (standard)
          const isDST = etFormatted.includes('EDT')
          const offsetHours = isDST ? 4 : 5 // EDT = UTC-4, EST = UTC-5

          // Now create the actual UTC timestamp
          // The time "2025-10-24 19:21:00" in ET needs to have offsetHours added to convert to UTC
          const utcTimestamp = Date.UTC(year, month - 1, day, hours + offsetHours, minutes, seconds)

          utcDate = new Date(utcTimestamp).toISOString()
        } catch (error) {
          console.error('Error converting date:', error, article.publishedDate)
          // Fallback to original
        }
      }

      return {
        ...article,
        publishedDate: utcDate
      }
    })

    // Sort by published date (newest first)
    const sortedNews = newsWithUTC.sort((a: any, b: any) => {
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    })

    return NextResponse.json({
      news: sortedNews,
      total: sortedNews.length
    })

  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
