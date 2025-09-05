/**
 * SQL Query execution tool (stub)
 * TODO: Implement actual SQL query execution
 */

export async function executeSQLQuery(params: {
  query: string;
  symbols?: string[];
  limit?: number;
  description?: string;
  expectedResultType?: string;
}): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  console.warn('executeSQLQuery called but not implemented:', params);
  
  // Return stub data for now
  return {
    success: false,
    error: 'SQL query execution not yet implemented'
  };
}