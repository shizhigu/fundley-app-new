import { NextResponse } from 'next/server'
import { fieldSearch } from '@/lib/fmp/field-search'

export async function POST(req: Request) {
  try {
    const startTime = Date.now()
    const { query, limit = 5 } = await req.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }
    
    const embedStartTime = Date.now()
    const results = await fieldSearch.searchFields(query, limit)
    const embedTime = Date.now() - embedStartTime
    
    const totalTime = Date.now() - startTime
    
    console.log(`Field search timing - Total: ${totalTime}ms, Embed+Search: ${embedTime}ms`)
    
    return NextResponse.json({ 
      results,
      timing: {
        total: totalTime,
        search: embedTime
      }
    })
  } catch (error) {
    console.error('Field search error:', error)
    return NextResponse.json(
      { error: 'Failed to search fields' },
      { status: 500 }
    )
  }
}