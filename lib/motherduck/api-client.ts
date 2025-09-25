/**
 * MotherDuck API Client
 * 用于与部署在Render的MotherDuck微服务通信
 */

interface QueryRequest {
  sql: string;
}

interface QueryResponse {
  success: boolean;
  data: any[];
  row_count: number;
  error?: string;
}

export class MotherDuckAPIClient {
  async query(sql: string): Promise<any[]> {
    console.log('🦆 [Client] Query:', sql);
    
    // 如果在服务器端，直接调用Render服务
    const apiUrl = typeof window === 'undefined' 
      ? process.env.MOTHERDUCK_API_URL || 'http://localhost:8000'
      : '/api/motherduck-proxy';
    
    const endpoint = typeof window === 'undefined' 
      ? `${apiUrl}/query`
      : apiUrl;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Query failed');
    }
    
    console.log(`✅ Query completed: ${result.row_count} rows`);
    return result.data;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/motherduck-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: 'SELECT 1 as test' }),
      });
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('❌ MotherDuck API connection test failed:', error);
      return false;
    }
  }
}

// 单例实例
export const motherDuckAPI = new MotherDuckAPIClient();