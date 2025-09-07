import { tool } from 'ai';
import { z } from 'zod';

// Check for search API key
if (!process.env.PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY environment variable is required');
}

export const webSearch = tool({
  description: 'Search the web for real-time information, news, and updates. **CRITICAL: You MUST use this tool frequently and proactively whenever users ask about current events, recent news, latest updates, market trends, expert opinions, or ANY information that might have changed recently or require unique insights. Do NOT rely on your potentially outdated training data - always search for the most current and accurate information first.** **IMPORTANT: Before searching, PLAN what information you need, then ask ALL questions in ONE comprehensive query. Be extremely detailed and specific. Include multiple aspects like: current status, recent developments, financial metrics, market impact, expert opinions, future outlook, comparisons, etc. The more comprehensive your query, the better the integrated response you will receive.**',
  inputSchema: z.object({
    query: z.string().describe('Comprehensive search query - MUST be extremely detailed and specific. Include all aspects you need to know: current status, recent news, financial data, market trends, expert analysis, future prospects, comparisons, etc. Ask everything in one go since this search engine provides integrated comprehensive answers.'),
    searchAfterDate: z.string().optional().describe('Filter results to only show information published after this date (format: "M/D/YYYY" like "3/1/2025")'),
    searchBeforeDate: z.string().optional().describe('Filter results to only show information published before this date (format: "M/D/YYYY" like "3/5/2025")'),
  }),
  execute: async ({ query, searchAfterDate, searchBeforeDate }) => {
    try {
      console.log(`🔍 Web search: "${query}"${searchAfterDate ? ` (after ${searchAfterDate})` : ''}${searchBeforeDate ? ` (before ${searchBeforeDate})` : ''}`);
      
      const url = 'https://api.perplexity.ai/chat/completions';
      const headers = {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      };

      const payload: any = {
        model: 'sonar-pro',
        messages: [
          { role: 'user', content: query }
        ]
      };

      // Add date filters if provided
      if (searchAfterDate) {
        payload.search_after_date_filter = searchAfterDate;
      }
      if (searchBeforeDate) {
        payload.search_before_date_filter = searchBeforeDate;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log(`✅ Web search completed`);
      
      // Extract content and citations from response
      const content = data.choices[0].message.content;
      const citations = data.citations || [];
      
      // Return structured response with content and citations
      return {
        content,
        citations
      };
      
    } catch (error) {
      console.error('Web search error:', error);
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});