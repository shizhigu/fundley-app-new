"""
Web Search Tool for ADK - Using Perplexity API
简化版本：直接async function
"""
import os
import aiohttp
from datetime import datetime
from typing import Dict, Any, Optional


async def web_search(query: str, search_after_date: Optional[str] = None, search_before_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Search the web for real-time information using Perplexity API

    Args:
        query: Comprehensive search query
        search_after_date: Filter results after this date (M/D/YYYY format)
        search_before_date: Filter results before this date (M/D/YYYY format)

    Returns:
        Dict with content, citations, search_query, and timestamp
    """
    # Check for API key
    api_key = os.getenv('PERPLEXITY_API_KEY')
    if not api_key:
        return {
            "error": "PERPLEXITY_API_KEY environment variable is required",
            "search_query": query,
            "timestamp": datetime.now().isoformat()
        }

    try:
        date_filter_info = ""
        if search_after_date:
            date_filter_info += f" (after {search_after_date})"
        if search_before_date:
            date_filter_info += f" (before {search_before_date})"

        print(f"🔍 Web search: \"{query}\"{date_filter_info}")

        url = 'https://api.perplexity.ai/chat/completions'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

        payload = {
            "model": "sonar-pro",
            "messages": [
                {"role": "user", "content": query}
            ]
        }

        # Add date filters if provided
        if search_after_date:
            payload["search_after_date_filter"] = search_after_date
        if search_before_date:
            payload["search_before_date_filter"] = search_before_date

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if not response.ok:
                    error_text = await response.text()
                    raise Exception(f"Perplexity API error: {response.status} {response.reason} - {error_text}")

                data = await response.json()

        print("✅ Web search completed")

        # Extract content and citations from response
        content = data['choices'][0]['message']['content']
        citations = data.get('citations', [])

        # Return structured response with content and citations
        return {
            "content": content,
            "citations": citations,
            "search_query": query,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as error:
        error_msg = f"Search failed: {str(error)}"
        print(f"❌ Web search error: {error_msg}")
        return {
            "error": error_msg,
            "search_query": query,
            "timestamp": datetime.now().isoformat()
        }