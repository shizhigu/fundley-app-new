// Message metadata parsing and types

export interface ChartConfig {
  type: 'line' | 'bar' | 'candlestick';
  title: string;
  data: string;
}

export interface AlertConfig {
  type: 'info' | 'warning' | 'error';
  message: string;
}

export interface MessageMetadata {
  tickers?: string[];
  suggestions?: string[];
  charts?: ChartConfig[];
  alerts?: AlertConfig[];
}

export interface ParsedMessage {
  content: string;
  metadata: MessageMetadata;
}

/**
 * Parse a message with meta tags and extract structured metadata
 * Removes meta tags from content and returns clean content + metadata
 */
export function parseMessageWithMeta(rawMessage: string): ParsedMessage {
  const metaRegex = /<meta:(\w+)>(.*?)<\/meta:\1>/g;
  const metadata: MessageMetadata = {};
  let content = rawMessage;
  
  let match;
  while ((match = metaRegex.exec(rawMessage)) !== null) {
    const [fullMatch, type, jsonContent] = match;
    try {
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate and assign metadata based on type
      switch (type) {
        case 'tickers':
          if (Array.isArray(parsedContent) && parsedContent.every(t => typeof t === 'string')) {
            metadata.tickers = parsedContent.map(t => t.toUpperCase());
          }
          break;
        case 'suggestions':
          if (Array.isArray(parsedContent) && parsedContent.every(s => typeof s === 'string')) {
            metadata.suggestions = parsedContent;
          }
          break;
        case 'charts':
          if (Array.isArray(parsedContent)) {
            metadata.charts = parsedContent.filter(isValidChartConfig);
          }
          break;
        case 'alerts':
          if (Array.isArray(parsedContent)) {
            metadata.alerts = parsedContent.filter(isValidAlertConfig);
          }
          break;
        default:
          console.warn(`Unknown meta tag type: ${type}`);
      }
      
      // Remove the meta tag from content
      content = content.replace(fullMatch, '');
    } catch (error) {
      console.warn(`Invalid meta tag JSON: ${fullMatch}`, error);
    }
  }
  
  return { 
    content: content.trim(), 
    metadata 
  };
}

/**
 * Type guards for validating metadata structures
 */
function isValidChartConfig(obj: any): obj is ChartConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.type === 'string' &&
    ['line', 'bar', 'candlestick'].includes(obj.type) &&
    typeof obj.title === 'string' &&
    typeof obj.data === 'string'
  );
}

function isValidAlertConfig(obj: any): obj is AlertConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.type === 'string' &&
    ['info', 'warning', 'error'].includes(obj.type) &&
    typeof obj.message === 'string'
  );
}

/**
 * Check if a message has any metadata
 */
export function hasMetadata(metadata: MessageMetadata): boolean {
  return !!(
    metadata.tickers?.length ||
    metadata.suggestions?.length ||
    metadata.charts?.length ||
    metadata.alerts?.length
  );
}

/**
 * Generate formatted string for debugging/logging
 */
export function formatMetadata(metadata: MessageMetadata): string {
  const parts: string[] = [];
  
  if (metadata.tickers?.length) {
    parts.push(`Tickers: ${metadata.tickers.join(', ')}`);
  }
  
  if (metadata.suggestions?.length) {
    parts.push(`Suggestions: ${metadata.suggestions.length} items`);
  }
  
  if (metadata.charts?.length) {
    parts.push(`Charts: ${metadata.charts.length} items`);
  }
  
  if (metadata.alerts?.length) {
    parts.push(`Alerts: ${metadata.alerts.length} items`);
  }
  
  return parts.join(' | ');
}