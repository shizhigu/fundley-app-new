import { tool } from 'ai';
import { z } from 'zod';

// SEC-API.io configuration
const SEC_API_KEY = process.env.SEC_API_KEY;
const SEC_API_BASE_URL = 'https://api.sec-api.io';

if (!SEC_API_KEY) {
  console.warn('SEC_API_KEY not found in environment variables. SEC filing tools will not work.');
}

console.log('🚀 SEC-filings.ts loaded with inputSchema fix');

// Helper function to make SEC-API requests
async function makeSecApiRequest(endpoint: string, params: Record<string, any>) {
  if (!SEC_API_KEY) {
    throw new Error('SEC API key not configured');
  }

  const url = `${SEC_API_BASE_URL}${endpoint}`;
  
  // For Query API, send as POST with JSON body
  if (endpoint === '' || endpoint === '/query') {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': SEC_API_KEY
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // For Extractor API, handle compressed response
  if (endpoint === '/extractor') {
    const urlWithParams = new URL(url);
    urlWithParams.searchParams.append('token', SEC_API_KEY);
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        urlWithParams.searchParams.append(key, value.toString());
      }
    }

    const response = await fetch(urlWithParams.toString(), {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
    }

    // Return text directly for extractor API
    return response.text();
  }
  
  // For other endpoints, use GET with query params
  const urlWithParams = new URL(url);
  urlWithParams.searchParams.append('token', SEC_API_KEY);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      urlWithParams.searchParams.append(key, value.toString());
    }
  }

  const response = await fetch(urlWithParams.toString());
  
  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Extract Management Discussion & Analysis (MD&A) - UPDATED
export const extractMDA = tool({
  description: 'Extract Management Discussion & Analysis (MD&A) section from SEC filings. You MUST provide a stock ticker symbol (e.g., AAPL for Apple, TSLA for Tesla, MSFT for Microsoft). This tool extracts MD&A from 10-K Section 7 (annual) or 10-Q Part 1 Item 2 (quarterly).',
  inputSchema: z.object({
    symbol: z.string().describe('REQUIRED: Stock ticker symbol like AAPL, TSLA, MSFT, GOOGL, AMZN, etc.'),
    formType: z.enum(['10-K', '10-Q']).optional().default('10-K').describe('Filing type: 10-K (annual) or 10-Q (quarterly)'),
    filingYear: z.number().optional().describe('Optional: Specific year (e.g., 2025, 2023)')
  }),
  execute: async ({ symbol, formType, filingYear }) => {
    console.log('🔍 extractMDA called with params:', { symbol, formType, filingYear });
    console.log('🔍 symbol type:', typeof symbol, 'value:', symbol);
    
    if (!symbol) {
      console.error('❌ Symbol is undefined or null');
      return {
        error: 'Symbol parameter is required but was not provided',
        success: false
      };
    }
    
    try {
      // Step 1: Find the most recent filing
      const queryString = `ticker:${symbol.toUpperCase()} AND formType:"${formType}"${filingYear ? ` AND filedAt:{${filingYear}-01-01 TO ${filingYear}-12-31}` : ''}`;
      
      const searchQuery = {
        query: queryString,
        from: "0",
        size: "1",
        sort: [{ "filedAt": { "order": "desc" } }]
      };

      const searchResults = await makeSecApiRequest('', searchQuery);

      if (!searchResults.filings || searchResults.filings.length === 0) {
        return {
          error: `No ${formType} filings found for ${symbol}${filingYear ? ` in ${filingYear}` : ''}`,
          success: false
        };
      }

      const filing = searchResults.filings[0];
      
      // Step 2: Extract MD&A section
      const sectionKey = formType === '10-K' ? '7' : 'part1item2';  // Section 7 for 10-K, Part 1 Item 2 for 10-Q
      const extractorParams = {
        url: filing.linkToFilingDetails,
        item: sectionKey
      };

      const extractedData = await makeSecApiRequest('/extractor', extractorParams);
      
      // Step 3: Structure data for LLM consumption
      return {
        success: true,
        company: {
          symbol: symbol.toUpperCase(),
          name: filing.companyName,
          cik: filing.cik
        },
        filing: {
          type: formType,
          date: filing.filedAt,
          period: filing.periodOfReport,
          accessionNumber: filing.accessionNo,
          url: filing.linkToFilingDetails
        },
        mdaContent: {
          title: formType === '10-K' ? 'Management\'s Discussion and Analysis of Financial Condition and Results of Operations' : 'Management\'s Discussion and Analysis',
          content: extractedData || '',
          wordCount: (extractedData || '').split(' ').length,
          keyTopics: extractKeyTopics(extractedData || ''),
          summary: generateMdaSummary(extractedData || '')
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          dataSource: 'SEC-API.io'
        }
      };

    } catch (error: any) {
      return {
        error: `Failed to extract MD&A: ${error.message}`,
        success: false
      };
    }
  }
});

// Extract Risk Factors (Section 1A for 10-K)
export const extractRiskFactors = tool({
  description: 'Extract Risk Factors section from 10-K annual SEC filings. You MUST provide a stock ticker symbol (e.g., AAPL for Apple, TSLA for Tesla). Extracts Section 1A containing detailed business risk disclosures.',
  inputSchema: z.object({
    symbol: z.string().describe('REQUIRED: Stock ticker symbol like AAPL, TSLA, MSFT, GOOGL, AMZN, etc.'),
    filingYear: z.number().optional().describe('Optional: Specific year (e.g., 2025, 2023)')
  }),
  execute: async ({ symbol, filingYear }) => {
    try {
      // Find most recent 10-K filing
      const queryString = `ticker:${symbol.toUpperCase()} AND formType:"10-K"${filingYear ? ` AND filedAt:{${filingYear}-01-01 TO ${filingYear}-12-31}` : ''}`;
      
      const searchQuery = {
        query: queryString,
        from: "0",
        size: "1",
        sort: [{ "filedAt": { "order": "desc" } }]
      };

      const searchResults = await makeSecApiRequest('', searchQuery);

      if (!searchResults.filings || searchResults.filings.length === 0) {
        return {
          error: `No 10-K filings found for ${symbol}${filingYear ? ` in ${filingYear}` : ''}`,
          success: false
        };
      }

      const filing = searchResults.filings[0];
      
      // Extract Risk Factors (Section 1A)
      const extractorParams = {
        url: filing.linkToFilingDetails,
        item: '1A'
      };

      const extractedData = await makeSecApiRequest('/extractor', extractorParams);
      
      return {
        success: true,
        company: {
          symbol: symbol.toUpperCase(),
          name: filing.companyName,
          cik: filing.cik
        },
        filing: {
          type: '10-K',
          date: filing.filedAt,
          period: filing.periodOfReport,
          accessionNumber: filing.accessionNo,
          url: filing.linkToFilingDetails
        },
        riskFactors: {
          title: 'Risk Factors',
          content: extractedData || '',
          wordCount: (extractedData || '').split(' ').length,
          keyRisks: extractKeyRisks(extractedData || ''),
          riskCategories: categorizeRisks(extractedData || '')
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          dataSource: 'SEC-API.io'
        }
      };

    } catch (error: any) {
      return {
        error: `Failed to extract Risk Factors: ${error.message}`,
        success: false
      };
    }
  }
});

// Extract Business Overview (Section 1 for 10-K)
export const extractBusinessOverview = tool({
  description: 'Extract Business overview section from 10-K annual SEC filings. You MUST provide a stock ticker symbol (e.g., AAPL for Apple, TSLA for Tesla). Extracts Section 1 describing business operations and strategy.',
  inputSchema: z.object({
    symbol: z.string().describe('REQUIRED: Stock ticker symbol like AAPL, TSLA, MSFT, GOOGL, AMZN, etc.'),
    filingYear: z.number().optional().describe('Optional: Specific year (e.g., 2025, 2023)')
  }),
  execute: async ({ symbol, filingYear }) => {
    try {
      // Find most recent 10-K filing
      const queryString = `ticker:${symbol.toUpperCase()} AND formType:"10-K"${filingYear ? ` AND filedAt:{${filingYear}-01-01 TO ${filingYear}-12-31}` : ''}`;
      
      const searchQuery = {
        query: queryString,
        from: "0",
        size: "1",
        sort: [{ "filedAt": { "order": "desc" } }]
      };

      const searchResults = await makeSecApiRequest('', searchQuery);

      if (!searchResults.filings || searchResults.filings.length === 0) {
        return {
          error: `No 10-K filings found for ${symbol}${filingYear ? ` in ${filingYear}` : ''}`,
          success: false
        };
      }

      const filing = searchResults.filings[0];
      
      // Extract Business section (Section 1)
      const extractorParams = {
        url: filing.linkToFilingDetails,
        item: '1'
      };

      const extractedData = await makeSecApiRequest('/extractor', extractorParams);
      
      return {
        success: true,
        company: {
          symbol: symbol.toUpperCase(),
          name: filing.companyName,
          cik: filing.cik
        },
        filing: {
          type: '10-K',
          date: filing.filedAt,
          period: filing.periodOfReport,
          accessionNumber: filing.accessionNo,
          url: filing.linkToFilingDetails
        },
        businessOverview: {
          title: 'Business',
          content: extractedData || '',
          wordCount: (extractedData || '').split(' ').length,
          keyPoints: extractBusinessKeyPoints(extractedData || ''),
          businessSegments: extractBusinessSegments(extractedData || '')
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          dataSource: 'SEC-API.io'
        }
      };

    } catch (error: any) {
      return {
        error: `Failed to extract Business Overview: ${error.message}`,
        success: false
      };
    }
  }
});

// Helper function to extract key topics from MD&A
function extractKeyTopics(content: string): string[] {
  const topics = [];
  const lowerContent = content.toLowerCase();
  
  // Common MD&A topics to look for
  const topicKeywords = [
    'revenue', 'sales', 'income', 'profit', 'margin', 'cash flow',
    'acquisition', 'merger', 'expansion', 'growth', 'market share',
    'competition', 'regulation', 'currency', 'commodity', 'debt',
    'liquidity', 'capital', 'investment', 'dividend', 'restructuring'
  ];

  for (const keyword of topicKeywords) {
    if (lowerContent.includes(keyword)) {
      topics.push(keyword);
    }
  }

  return topics.slice(0, 10); // Return top 10 topics
}

// Helper function to generate MD&A summary
function generateMdaSummary(content: string): string {
  if (!content) return 'No content available';
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 50);
  const firstTwoSentences = sentences.slice(0, 2).join('. ');
  
  return firstTwoSentences + (sentences.length > 2 ? '...' : '');
}

// Helper function to extract key risks
function extractKeyRisks(content: string): string[] {
  const risks = [];
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 100);
  
  // Extract first sentence of each paragraph as potential risk
  for (const paragraph of paragraphs.slice(0, 10)) {
    const firstSentence = paragraph.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 30) {
      risks.push(firstSentence);
    }
  }
  
  return risks;
}

// Helper function to categorize risks
function categorizeRisks(content: string): string[] {
  const categories = [];
  const lowerContent = content.toLowerCase();
  
  const riskCategories = {
    'Market Risk': ['market', 'economic', 'recession', 'volatility'],
    'Operational Risk': ['operational', 'supply chain', 'manufacturing', 'production'],
    'Regulatory Risk': ['regulatory', 'compliance', 'government', 'legislation'],
    'Competitive Risk': ['competition', 'competitive', 'market share', 'rivals'],
    'Financial Risk': ['financial', 'credit', 'liquidity', 'debt', 'cash'],
    'Technology Risk': ['technology', 'cybersecurity', 'data', 'systems']
  };

  for (const [category, keywords] of Object.entries(riskCategories)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      categories.push(category);
    }
  }

  return categories;
}

// Helper function to extract business key points
function extractBusinessKeyPoints(content: string): string[] {
  const points = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 50);
  
  // Look for sentences that describe key business activities
  const keywordPatterns = [
    /we (operate|provide|offer|manufacture|develop|sell)/i,
    /our (business|operations|products|services|strategy)/i,
    /the company (focuses|specializes|operates|provides)/i
  ];

  for (const sentence of sentences.slice(0, 20)) {
    if (keywordPatterns.some(pattern => pattern.test(sentence))) {
      points.push(sentence.trim());
    }
  }

  return points.slice(0, 5);
}

// Helper function to extract business segments
function extractBusinessSegments(content: string): string[] {
  const segments = [];
  const lowerContent = content.toLowerCase();
  
  // Look for common business segment indicators
  const segmentIndicators = [
    'segment', 'division', 'business unit', 'subsidiary',
    'geography', 'region', 'product line', 'service area'
  ];

  const paragraphs = content.split('\n\n');
  for (const paragraph of paragraphs) {
    if (segmentIndicators.some(indicator => paragraph.toLowerCase().includes(indicator))) {
      const firstSentence = paragraph.split(/[.!?]/)[0]?.trim();
      if (firstSentence && firstSentence.length > 30) {
        segments.push(firstSentence);
      }
    }
  }

  return segments.slice(0, 5);
}