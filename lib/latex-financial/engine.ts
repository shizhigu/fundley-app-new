/**
 * LaTeX Financial Engine
 * 全新的LaTeX-first财务计算引擎
 */

import { financialFieldsModel } from '@/lib/ai/providers';
import { generateText } from 'ai';
// Dynamic import for DuckDB to prevent build-time errors in cloud environments
import { incomeStatementFields } from '@/lib/fmp/income-statement-fields';
import { balanceSheetFields } from '@/lib/fmp/balance-sheet-fields';
import { cashFlowFields } from '@/lib/fmp/cash-flow-fields';
import { companyProfileFields } from '@/lib/fmp/company-profile-fields';
import type {
  LaTeXMetricDefinition,
  LaTeXCalculationRequest,
  LaTeXCalculationResult,
  SQLGenerationContext,
  LLMSQLResponse
} from './types';
import { LaTeXEngineError } from './types';

import { motherDuckAPI } from '@/lib/motherduck/api-client';

/**
 * MotherDuck API Client for LaTeX Engine
 * 使用部署在Render的Python FastAPI服务
 */
class MotherDuckClient {
  async query(sql: string): Promise<any[]> {
    try {
      console.log('🦆 LaTeX Engine: Executing SQL via MotherDuck API:', sql);
      
      const rows = await motherDuckAPI.query(sql);
      
      console.log(`📊 LaTeX Engine: MotherDuck API query returned ${rows.length} rows`);
      
      const processedRows = this.processBigIntValues(rows);
      return processedRows;
      
    } catch (error) {
      console.error('❌ LaTeX Engine: MotherDuck API query error:', error);
      throw error;
    }
  }
  
  /**
   * 处理查询结果中的BigInt值，转换为普通数字
   */
  private processBigIntValues(rows: any[]): any[] {
    return rows.map(row => {
      const processedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'bigint') {
          // 将BigInt转换为数字，如果太大则转为字符串
          processedRow[key] = value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER 
            ? value.toString() 
            : Number(value);
        } else {
          processedRow[key] = value;
        }
      }
      return processedRow;
    });
  }
  
  async close(): Promise<void> {
    console.log('🦆 LaTeX Engine: MotherDuck API client - no cleanup needed');
  }
}

/**
 * 核心LaTeX财务引擎
 */
export class LaTeXFinancialEngine {
  private duckdb: MotherDuckClient | null = null;
  
  constructor() {
    // Lazy initialization - client will be created when first needed
  }

  private getClient(): MotherDuckClient {
    if (!this.duckdb) {
      this.duckdb = new MotherDuckClient();
    }
    return this.duckdb;
  }

  /**
   * 执行SQL查询（仅负责执行，不生成SQL）
   */
  async executeSQL(sql: string, metricName: string): Promise<LaTeXCalculationResult> {
    const startTime = performance.now();
    console.log(`🚀 LaTeX Engine executing SQL for: ${metricName}`);
    console.log(`📊 SQL: ${sql}`);

    try {
      // 基础SQL安全验证
      this.validateSQL(sql);

      // 执行DuckDB查询
      const duckdbStart = performance.now();
      const rawResults = await this.getClient().query(sql);
      const duckdbExecutionTime = performance.now() - duckdbStart;

      console.log(`📊 DuckDB returned ${rawResults.length} rows`);

      // 处理结果（保留所有字段，限制行数）
      const processedResults = this.processResults(rawResults);

      const totalTime = performance.now() - startTime;
      console.log(`⚡ SQL execution completed in ${totalTime}ms`);

      return {
        metric: metricName,
        data: processedResults.rows,
        metadata: {
          executionTimeMs: totalTime,
          generatedSQL: sql,
          rowsProcessed: rawResults.length,
          displayedRows: processedResults.displayedRows,
          hasMoreRows: processedResults.hasOverflow,
          duckdbExecutionTimeMs: duckdbExecutionTime,
          ...(processedResults.hasOverflow && {
            warning: `Results limited to 200 rows (${rawResults.length} total rows available)`
          })
        }
      };

    } catch (error) {
      console.error('❌ LaTeX Engine SQL execution error:', error);
      throw new LaTeXEngineError(
        `Failed to execute SQL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXECUTION_ERROR',
        { originalError: error }
      );
    }
  }



  /**
   * 基础SQL安全验证
   */
  private validateSQL(sql: string): void {
    const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE'];
    const upperSQL = sql.toUpperCase();
    
    for (const keyword of dangerous) {
      if (upperSQL.includes(keyword)) {
        throw new LaTeXEngineError(
          `Dangerous SQL keyword detected: ${keyword}`,
          'VALIDATION_ERROR',
          { sql }
        );
      }
    }
  }

  /**
   * Process query results - preserve all fields, limit rows, handle BigInt
   */
  private processResults(results: any[]): {
    rows: any[];
    displayedRows: number;
    hasOverflow: boolean;
  } {
    // Limit results to 200 rows to prevent overwhelming the agent
    const limitedResults = results.slice(0, 200);
    const hasOverflow = results.length > 200;
    
    // Process all rows, preserving all fields and handling BigInt values
    const processedRows = limitedResults.map(row => {
      const processedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'bigint') {
          // Convert BigInt to number or string if too large
          processedRow[key] = value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER 
            ? parseFloat(value.toString())
            : Number(value);
        } else {
          processedRow[key] = value;
        }
      }
      return processedRow;
    });
    
    return {
      rows: processedRows,
      displayedRows: limitedResults.length,
      hasOverflow
    };
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.duckdb) {
      await this.duckdb.close();
    }
  }
}