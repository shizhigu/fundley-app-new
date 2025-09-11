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
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.MOTHERDUCK_API_URL || 'https://fundley-backend.onrender.com';
  }
  
  async query(sql: string): Promise<any[]> {
    try {
      console.log('🦆 [MotherDuck API] Starting query:', sql);
      console.log('🦆 [MotherDuck API] Base URL:', this.baseUrl);
      console.log('🦆 [MotherDuck API] Environment:', process.env.NODE_ENV);
      
      const requestStart = Date.now();
      
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Fundley-MotherDuck-Client/1.0',
        },
        body: JSON.stringify({ sql }),
      });
      
      const requestEnd = Date.now();
      console.log(`🦆 [MotherDuck API] Request completed in ${requestEnd - requestStart}ms`);
      console.log('🦆 [MotherDuck API] Response status:', response.status);
      console.log('🦆 [MotherDuck API] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: QueryResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Query failed');
      }
      
      console.log(`✅ MotherDuck API query completed: ${result.row_count} rows`);
      return result.data;
      
    } catch (error) {
      console.error('❌ MotherDuck API query failed:', error);
      throw new Error(`MotherDuck API query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('❌ MotherDuck API connection test failed:', error);
      return false;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const result = await response.json();
      return result.status === 'healthy';
    } catch (error) {
      console.error('❌ MotherDuck API health check failed:', error);
      return false;
    }
  }
}

// 单例实例
export const motherDuckAPI = new MotherDuckAPIClient();