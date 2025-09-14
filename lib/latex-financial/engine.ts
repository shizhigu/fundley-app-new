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
   * 计算LaTeX定义的财务指标
   */
  async calculateMetric(request: LaTeXCalculationRequest): Promise<LaTeXCalculationResult> {
    const startTime = performance.now();
    console.log(`🚀 LaTeX Engine calculating: ${request.metricDefinition.name}`);
    console.log(`📊 Formula: ${request.metricDefinition.latexFormula}`);
    console.log(`💬 Query: ${request.query}`);
    
    try {
      // 第1步：LaTeX公式 + 上下文 → LLM生成SQL
      const sqlGenStart = performance.now();
      const generatedSQL = await this.generateSQL({
        latexFormula: request.metricDefinition.latexFormula,
        query: request.query
      });
      const sqlGenerationTime = performance.now() - sqlGenStart;
      
      console.log('🧠 Generated SQL:', generatedSQL);
      
      // 第2步：执行DuckDB查询
      const duckdbStart = performance.now();
      const rawResults = await this.getClient().query(generatedSQL);
      const duckdbExecutionTime = performance.now() - duckdbStart;
      
      console.log(`📊 DuckDB returned ${rawResults.length} rows`);
      
      // 第3步：处理结果（保留所有字段，限制行数）
      const processedResults = this.processResults(rawResults);
      
      const totalTime = performance.now() - startTime;
      console.log(`⚡ LaTeX calculation completed in ${totalTime}ms`);

      return {
        metric: request.metricDefinition.name,
        data: processedResults.rows,
        metadata: {
          executionTimeMs: totalTime,
          generatedSQL,
          rowsProcessed: rawResults.length,
          displayedRows: processedResults.displayedRows,
          hasMoreRows: processedResults.hasOverflow,
          sqlGenerationTimeMs: sqlGenerationTime,
          duckdbExecutionTimeMs: duckdbExecutionTime,
          ...(processedResults.hasOverflow && {
            warning: `Results limited to 200 rows (${rawResults.length} total rows available)`
          })
        }
      };

    } catch (error) {
      console.error('❌ LaTeX Engine calculation error:', error);
      throw new LaTeXEngineError(
        `Failed to calculate metric: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXECUTION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * LaTeX公式 + 上下文 → LLM生成优化的DuckDB SQL
   */
  private async generateSQL(context: SQLGenerationContext): Promise<string> {
    const prompt = this.buildSQLGenerationPrompt(context);
    
    try {
      const { text: response } = await generateText({
        model: financialFieldsModel,
        prompt,
        temperature: 0.1,
      });
      
      console.log('🔍 Raw LLM response:', response);
      
      // 手动解析JSON
      const jsonResult = this.parseJSONFromResponse(response);
      
      console.log('🧠 Generated SQL:', jsonResult.sql);
      console.log('💡 Explanation:', jsonResult.explanation);
      
      // 基础SQL安全验证
      this.validateSQL(jsonResult.sql);
      
      return jsonResult.sql;
      
    } catch (error) {
      throw new LaTeXEngineError(
        `SQL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SQL_GENERATION_FAILED',
        { context, originalError: error }
      );
    }
  }

  /**
   * 从LLM响应中解析JSON
   */
  private parseJSONFromResponse(response: string): { sql: string; explanation: string } {
    try {
      // 首先尝试直接解析
      const parsed = JSON.parse(response);
      if (parsed.sql && parsed.explanation) {
        return parsed;
      }
    } catch (error) {
      // 如果直接解析失败，尝试从响应中提取JSON
    }
    
    // 尝试从markdown代码块中提取JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.sql && parsed.explanation) {
          return parsed;
        }
      } catch (error) {
        // 继续尝试其他方法
      }
    }
    
    // 尝试查找任何看起来像JSON的内容
    const possibleJsonMatch = response.match(/\{[\s\S]*\}/);
    if (possibleJsonMatch) {
      try {
        const parsed = JSON.parse(possibleJsonMatch[0]);
        if (parsed.sql && parsed.explanation) {
          return parsed;
        }
      } catch (error) {
        // 继续
      }
    }
    
    throw new Error(`Could not parse JSON from response: ${response}`);
  }

  /**
   * 构建SQL生成的LLM prompt
   */
  private buildSQLGenerationPrompt(context: SQLGenerationContext): string {
    // 生成完整的字段映射信息，所有字段名转为小写
    const incomeFields = incomeStatementFields.map(f => 
      `${f.name}: ${f.field.toLowerCase()} (${f.description}) - aliases: ${f.aliases.join(', ')}`
    ).join('\n');
    
    const balanceFields = balanceSheetFields.map(f => 
      `${f.name}: ${f.field.toLowerCase()} (${f.description}) - aliases: ${f.aliases.join(', ')}`
    ).join('\n');
    
    const cashFlowFieldsList = cashFlowFields.map(f => 
      `${f.name}: ${f.field.toLowerCase()} (${f.description}) - aliases: ${f.aliases.join(', ')}`
    ).join('\n');

    const companyFields = companyProfileFields.map(f => 
      `${f.name}: ${f.field.toLowerCase()} (${f.description}) - aliases: ${f.aliases.join(', ')}`
    ).join('\n');

    return `# DuckDB SQL Generation from LaTeX Financial Formula

## Task
Convert LaTeX financial formulas into optimized DuckDB SQL queries based on user's natural language requests.

## Formula Definition
LaTeX Formula: ${context.latexFormula}

## User Query
User Request: "${context.query}"

## Performance-First Analysis Framework
Analyze the user's natural language query and intelligently decide on optimization strategy:

### 🎯 Performance Mode Selection

**Speed Mode (Priority Choice)**:
- Single stock, current period queries
- Basic ratio calculations  
- Direct table JOINs without CTEs
- Example: "AAPL's current ROE" → Direct calculation

**Standard Mode (Balanced Choice)**:
- Multiple stocks, latest period analysis
- 1-2 CTE structure maximum
- Moderate complexity calculations
- Example: "Tech stocks ROE ranking" → Latest data + ranking

**Complete Mode (Use When Necessary)**:
- Historical trend analysis
- 3+ CTEs with window function optimization
- Complex business logic requiring multiple periods
- Example: "ROCE trend over 4 quarters" → Window functions for efficiency

### 🚀 DuckDB Optimization Strategies

**Columnar Advantage**:
- SELECT only necessary fields, avoid SELECT *
- Batch processing over row-by-row calculations
- Use LIMIT to control result set size

**Join Optimization**:
- Use USING(symbol, fiscalyear, period) for natural joins
- Prefer simple JOINs over complex subqueries
- Index-friendly filtering on symbol, fiscalyear, period

**Window Functions Over Complex JOINs**:
\`\`\`sql
-- ✅ Efficient: Window function for previous period
LAG(totalassets) OVER (PARTITION BY symbol ORDER BY fiscalyear, period)

-- ❌ Avoid: Complex cross-period LEFT JOINs
LEFT JOIN balance_sheet b2 ON ... AND complex_period_logic
\`\`\`

### 📊 Query Complexity Decision Tree

**Stock Selection**:
- Specific ticker mentioned → Use specified stocks
- "All markets", "entire market" → No symbol restriction
- Industry/sector mentioned → JOIN with company_profiles for filtering
- "Compare", "vs" → Select comparison targets
- "Ranking", "top N" → Query sufficient stocks for ranking

**Time Range Intelligence**:
- Specific time mentioned → Use specified time filters
- "Trends", "historical" → Select adequate historical periods
- "Latest", "current" → Use most recent data with MAX() optimization
- "Quarterly", "annual" → Choose corresponding period type

**Result Processing**:
- "Ranking", "sort" → Add ORDER BY with performance consideration
- "Top N" → Add LIMIT N efficiently
- "Compare" → Ensure comparison-friendly format
- "Average", "sum" → Add appropriate aggregation functions

### 💡 Optimization Examples

**Simple Query (Speed Mode)**:
\`\`\`sql
-- Current ROE for specific company
SELECT symbol, fiscalyear, period, 
       (netincome / NULLIF(shareholderequity, 0))::NUMERIC as metric_value
FROM income_statement i 
JOIN balance_sheet b USING(symbol, fiscalyear, period)
WHERE symbol = 'AAPL' AND fiscalyear = 2024 AND period = 'Q4'
\`\`\`

**Standard Query (Balanced Mode)**:
\`\`\`sql
-- Latest ROE ranking with efficient latest period selection
WITH latest_periods AS (
  SELECT symbol, MAX(fiscalyear || period) as latest_key
  FROM income_statement GROUP BY symbol
)
SELECT i.symbol, i.fiscalyear, i.period,
       (i.netincome / NULLIF(b.shareholderequity, 0))::NUMERIC as metric_value
FROM income_statement i 
JOIN balance_sheet b USING(symbol, fiscalyear, period)
JOIN latest_periods l ON i.symbol = l.symbol 
  AND (i.fiscalyear || i.period) = l.latest_key
ORDER BY metric_value DESC LIMIT 20
\`\`\`

**Complex Query (Optimized Complete Mode)**:
\`\`\`sql
-- Historical analysis with window functions (not complex JOINs)
WITH financial_data AS (
  SELECT i.symbol, i.fiscalyear, i.period, i.netincome,
         b.shareholderequity,
         LAG(b.shareholderequity) OVER (
           PARTITION BY i.symbol 
           ORDER BY i.fiscalyear, i.period
         ) as prev_equity
  FROM income_statement i 
  JOIN balance_sheet b USING(symbol, fiscalyear, period)
)
SELECT symbol, fiscalyear, period,
       (netincome / NULLIF((shareholderequity + COALESCE(prev_equity, shareholderequity)) / 2.0, 0))::NUMERIC as metric_value
FROM financial_data 
WHERE netincome IS NOT NULL
ORDER BY fiscalyear DESC, period DESC
\`\`\`

## Available Financial Data Fields

**Income Statement Table (income_statement)**:
${incomeFields.split('\n').slice(0, 10).join('\n')}

**Balance Sheet Table (balance_sheet)**:
${balanceFields.split('\n').slice(0, 10).join('\n')}

**Cash Flow Table (cash_flow_statement)**:
${cashFlowFieldsList.split('\n').slice(0, 10).join('\n')}

**Company Profile Table (company_profiles)**:
${companyFields.split('\n').slice(0, 10).join('\n')}

## SQL Generation Requirements

1. **Must include complete SELECT, FROM, WHERE clauses**
2. **Return relevant fields based on query requirements - typically include symbol, fiscalyear, period plus calculated metrics and any filtering fields**
3. **Use correct table names: income_statement, balance_sheet, cash_flow_statement, company_profiles**
4. **Filter by symbol and period in WHERE clause when applicable**
5. **Use NULLIF() to prevent division by zero errors**
6. **Convert calculated metrics to NUMERIC type**

## Intelligent SQL Pattern Examples
Generate SQL based on user query complexity and optimization mode:

**Basic Queries**:
- Pattern: SELECT symbol, fiscalyear, period, (formula)::NUMERIC AS calculated_metric, additional_fields FROM...
- Direct calculations without CTEs for single stock/period queries
- Include relevant fields based on query context (e.g., marketcap for ranking, industry for filtering)

**Ranking Queries**: 
- Add ORDER BY metric_value DESC LIMIT N
- Use efficient latest period selection with MAX()

**Comparison Queries**: 
- WHERE symbol IN ('A', 'B', 'C') for specific comparisons
- Ensure comparison-friendly result format

**Market-wide Analysis**:
- No symbol restrictions for entire market queries
- Consider using LIMIT for performance

**Time-based Filtering**:
- WHERE fiscalyear >= 2023 OR period LIKE 'Q4' for time ranges
- Use window functions for historical trends

**Advanced Filtering with Company Profiles**:
- **Industry Filter**: JOIN company_profiles cp ON i.symbol = cp.symbol WHERE cp.industry = 'Technology'
- **Market Cap Filter**: JOIN company_profiles cp ON i.symbol = cp.symbol WHERE cp.marketcap > 1000000000
- **Sector Analysis**: JOIN company_profiles cp ON i.symbol = cp.symbol WHERE cp.sector = 'Technology'
- **Geographic Filter**: JOIN company_profiles cp ON i.symbol = cp.symbol WHERE cp.country = 'US'

## Critical Implementation Rules:
1. **NULLIF function must have two parameters**: NULLIF(value, 0) not NULLIF(value)
2. **Must include all referenced fields in SELECT clause**
3. **Return fields based on query context**: Always include symbol, fiscalyear, period plus relevant data fields
4. **Ensure all calculated fields are properly defined in CTEs when needed**
5. **⚠️ CRITICAL: All field names must use lowercase! No camelCase!**
   - ✅ Correct: totalassets, netincome, shareholderequity, marketcap
   - ❌ Wrong: totalAssets, netIncome, shareholderEquity, marketCap

## Output Format Requirements

**Must output strict JSON format with the following fields:**

\`\`\`json
{
  "sql": "Complete DuckDB SQL query statement",
  "explanation": "Brief explanation of calculation logic"
}
\`\`\`

**Important Rules:**
1. Return only JSON, no additional text, explanations, or markdown
2. sql field must be a directly executable complete SQL statement
3. All field names use lowercase format
4. Ensure SQL syntax is completely correct`;
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