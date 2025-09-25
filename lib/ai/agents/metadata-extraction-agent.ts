// Metadata extraction disabled for AgentOS integration

/**
 * Disabled metadata extraction agent - returns empty metadata during AgentOS migration
 * @param messageParts - Complete parts array from assistant message (not used)
 * @param userQuestion - Original user question for context (not used)
 */
export async function extractMetadata(messageParts: any[], userQuestion?: string) {
  console.log('🔍 Metadata extraction disabled during AgentOS migration');

  return {
    success: true,
    metadata: {
      tickers: undefined,
      suggestions: undefined,
      containsRealData: false,
      verificationMessage: undefined
    }
  }
}