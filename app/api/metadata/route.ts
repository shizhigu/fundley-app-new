import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Add timeout and headers to avoid being blocked
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract metadata
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') ||
                  new URL(url).hostname;
                  
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       $('meta[name="twitter:description"]').attr('content') || 
                       '';

    return NextResponse.json({ 
      title: title.substring(0, 100), // Limit length
      description: description.substring(0, 200),
      url 
    });

  } catch (error) {
    console.error('Metadata fetch error:', error);
    
    // Fallback to URL-based title
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      return NextResponse.json({ 
        title: domain,
        description: `Content from ${domain}`,
        url,
        fallback: true
      });
    } catch {
      return NextResponse.json({ 
        title: 'Web Page',
        description: 'External content',
        url,
        fallback: true
      });
    }
  }
}