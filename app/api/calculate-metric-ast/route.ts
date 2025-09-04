import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Pool } from 'pg';

/**
 * Simplified Financial Metrics JSON AST Calculation API
 * 
 * 核心思路：
 * 1. 从AST中提取数据需求（表、字段、期间）
 * 2. 批量获取原始数据
 * 3. 递归计算AST节点
 * 4. 并发处理多个symbols
 */

// Types
interface MetricDefinition {
  name: string;
  description?: string;
  formula_display?: string;
  category?: string;
  ast: any;
  data_requirements?: {
    [table: string]: string[];
    periods_needed?: string[];
  };
}

interface CalculationRequest {
  metricDefinition: MetricDefinition;
  symbols: string[];
  periods?: number;
  periodType?: 'quarter' | 'annual';
  asOf?: string;
}

// AST Node Types
type ASTNode = 
  | FieldNode 
  | ArithmeticNode 
  | AggregationNode 
  | ConditionalNode 
  | ConstantNode 
  | RollingNode;

interface FieldNode {
  type: 'field';
  source: string;
  field: string;
  selector?: {
    type: 'single' | 'rolling';
    single?: { fiscalYear?: number; period?: string; position?: string };
    rolling?: { window_size: number; window_type: string; aggregation: string; from?: string };
  };
}

interface ArithmeticNode {
  type: 'arithmetic';
  operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'abs' | 'sqrt' | 'log' | 'log10' | 'round';
  left: ASTNode;
  right?: ASTNode;
}

interface AggregationNode {
  type: 'aggregation';
  function: 'sum' | 'average' | 'max' | 'min';
  values: ASTNode[];
}

interface ConditionalNode {
  type: 'conditional';
  condition: any;
  if_true: ASTNode;
  if_false: ASTNode;
}

interface ConstantNode {
  type: 'constant';
  value: number;
}

interface RollingNode {
  type: 'rolling_arithmetic';
  operation: ArithmeticNode;
  rolling: {
    window_size: number;
    window_type: 'quarter' | 'year';
    from: 'latest';
    aggregation: 'sum' | 'average' | 'max' | 'min' | 'product' | 'geometric_mean';
  };
}


// Raw Data Types
interface RawDataRow {
  symbol: string;
  fiscalyear: number;
  period: string;
  [field: string]: any;
}

interface DataRequirements {
  tables: Set<string>;
  fields: Set<string>;
  maxPeriods: number;
}

// Database connection
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

/**
 * 简化版本的财务计算引擎
 */
class SimplifiedFinancialEngine {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * 并发计算多个symbols的指标
   */
  async calculateMetric(
    metric: MetricDefinition,
    symbols: string[],
    options: {
      periods?: number;
      periodType?: 'quarter' | 'annual';
      asOf?: string;
    } = {}
  ) {
    console.log(`🚀 SimplifiedEngine: Starting calculation for ${symbols.length} symbols`);
    console.log(`📊 Metric: ${metric.name}`);
    console.log(`🔍 Symbols: ${symbols.join(', ')}`);
    console.log(`⚙️ Options:`, options);
    console.log(`📋 Full Metric Object:`, JSON.stringify(metric, null, 2));
    
    try {
      console.log(`🎯 About to start Promise.allSettled for symbols`);
      
      // 并发处理每个symbol
      const results = await Promise.allSettled(
        symbols.map((symbol, index) => {
          console.log(`  🎯 Starting calculation for symbol ${index + 1}/${symbols.length}: ${symbol}`);
          return this.calculateForSymbol(symbol, metric, options);
        })
      );
      
      console.log(`✅ Promise.allSettled completed with ${results.length} results`);
      results.forEach((result, i) => {
        console.log(`  Result ${i} (${symbols[i]}): ${result.status}`);
        if (result.status === 'rejected') {
          console.error(`    Error:`, result.reason);
        }
      });

      // 组装最终结果
      const finalResults: Record<string, any> = {};
      
      results.forEach((result, index) => {
        const symbol = symbols[index];
        if (result.status === 'fulfilled') {
          finalResults[symbol] = result.value;
        } else {
          console.error(`❌ Failed to calculate ${symbol}:`, result.reason);
          finalResults[symbol] = {
            error: result.reason.message,
            success: false,
            periods: []
          };
        }
      });

      const finalResponse = {
        metric_name: metric.name,
        results: finalResults,
        calculation_engine: 'SimplifiedFinancial_v1.0',
        timestamp: new Date().toISOString(),
        performance_stats: {
          total_symbols: symbols.length,
          successful_calculations: Object.values(finalResults).filter(r => r.success).length
        }
      };
      
      console.log(`✅ SimplifiedEngine: Completed ${metric.name} for ${symbols.length} symbols`);
      return finalResponse;
      
    } catch (error) {
      console.error(`❌ SimplifiedEngine: Fatal error during calculation:`, error);
      throw error;
    }
  }

  /**
   * 计算单个symbol的指标
   */
  private async calculateForSymbol(
    symbol: string, 
    metric: MetricDefinition, 
    options: {
      periods?: number;
      periodType?: 'quarter' | 'annual';
      asOf?: string;
    }
  ) {
    console.log(`🔍 Calculating ${metric.name} for ${symbol}`);

    try {
      // 1. 从AST中提取数据需求
      const requirements = this.extractDataRequirements(metric.ast);
      console.log(`📋 Data requirements for ${symbol}:`, {
        tables: Array.from(requirements.tables),
        fields: Array.from(requirements.fields),
        maxPeriods: requirements.maxPeriods
      });

      // 2. 获取需要计算的期间列表
      const periods = await this.getLatestPeriods(
        symbol, 
        options.periods || 5, 
        options.periodType || 'quarter'
      );
      if (periods.length === 0) {
        return {
          success: false,
          error: `No data available for ${symbol}`,
          periods: []
        };
      }

      // 3. 批量获取原始数据
      const rawData = await this.fetchRawData(
        symbol, 
        Array.from(requirements.tables),
        Array.from(requirements.fields),
        Math.max(requirements.maxPeriods, periods.length + 4)
      );

      // 4. 对每个期间进行计算 - 回到最简单的逻辑
      const periodResults = [];
      for (const period of periods) {
        try {
          console.log(`🔄 Calculating ${symbol} for period ${period}`);
          const value = this.evaluateAST(metric.ast, rawData, period);
          console.log(`✅ ${symbol} ${period} = ${value}`);
          
          periodResults.push({
            period,
            value,
            success: true,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`❌ Error calculating ${symbol} ${period}:`, error);
          console.error('❌ Period calculation error details:', {
            period,
            errorMessage: error.message,
            errorStack: error.stack
          });
          periodResults.push({
            period,
            value: null,
            success: false,
            error: error.message || 'Unknown calculation error'
          });
        }
      }

      return {
        success: periodResults.some(p => p.success),
        periods: periodResults,
        formula: metric.formula_display,
        calculation_method: 'SimplifiedRecursive_v1.0',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to calculate ${symbol}:`, error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Unknown error',
        periods: [],
        formula: metric.formula_display,
        calculation_method: 'SimplifiedRecursive_v1.0',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 从AST中提取所有数据需求
   */
  private extractDataRequirements(node: any): DataRequirements {
    const requirements: DataRequirements = {
      tables: new Set(),
      fields: new Set(),
      maxPeriods: 4 // 默认TTM需要4个期间
    };

    const traverse = (n: any) => {
      if (!n || typeof n !== 'object') return;

      if (n.type === 'field') {
        requirements.tables.add(n.source);
        requirements.fields.add(n.field);
      }

      if (n.type === 'rolling_arithmetic' || (n.selector?.type === 'rolling')) {
        const windowSize = n.rolling?.window_size || n.selector?.rolling?.window_size || 4;
        requirements.maxPeriods = Math.max(requirements.maxPeriods, windowSize);
      }

      // 递归遍历所有子节点
      Object.values(n).forEach(value => {
        if (typeof value === 'object') {
          traverse(value);
        }
      });

      // 处理数组
      if (Array.isArray(n.values)) {
        n.values.forEach(traverse);
      }
    };

    traverse(node);
    return requirements;
  }

  /**
   * 获取最新的可用期间
   */
  private async getLatestPeriods(
    symbol: string, 
    count: number, 
    periodType: 'quarter' | 'annual'
  ): Promise<string[]> {
    const periodPattern = periodType === 'quarter' ? ['Q1', 'Q2', 'Q3', 'Q4'] : ['FY'];
    const placeholders = periodPattern.map((_, i) => `$${i + 2}`).join(', ');
    
    // 使用INTERSECT确保期间在所有表中都存在
    const sql = `
      WITH available_periods AS (
        SELECT DISTINCT fiscalyear, period,
               CASE period 
                 WHEN 'Q4' THEN 4 
                 WHEN 'Q3' THEN 3 
                 WHEN 'Q2' THEN 2 
                 WHEN 'Q1' THEN 1 
                 WHEN 'FY' THEN 5 
               END as period_order
        FROM income_statement 
        WHERE symbol = $1 AND period IN (${placeholders})
        
        INTERSECT
        
        SELECT DISTINCT fiscalyear, period,
               CASE period 
                 WHEN 'Q4' THEN 4 
                 WHEN 'Q3' THEN 3 
                 WHEN 'Q2' THEN 2 
                 WHEN 'Q1' THEN 1 
                 WHEN 'FY' THEN 5 
               END as period_order
        FROM balance_sheet 
        WHERE symbol = $1 AND period IN (${placeholders})
        
        INTERSECT
        
        SELECT DISTINCT fiscalyear, period,
               CASE period 
                 WHEN 'Q4' THEN 4 
                 WHEN 'Q3' THEN 3 
                 WHEN 'Q2' THEN 2 
                 WHEN 'Q1' THEN 1 
                 WHEN 'FY' THEN 5 
               END as period_order
        FROM cash_flow_statement 
        WHERE symbol = $1 AND period IN (${placeholders})
      )
      SELECT fiscalyear, period
      FROM available_periods
      ORDER BY fiscalyear DESC, period_order DESC
      LIMIT $${periodPattern.length + 2}
    `;
    
    const params = [symbol, ...periodPattern, count];
    const result = await this.pool.query(sql, params);
    
    return result.rows.map(row => `${row.fiscalyear}-${row.period}`);
  }

  /**
   * 批量获取原始数据
   */
  private async fetchRawData(
    symbol: string,
    tables: string[],
    fields: string[],
    periodCount: number
  ): Promise<RawDataRow[]> {
    console.log(`🔍 fetchRawData called with:`, {
      symbol,
      tables,
      fields,
      periodCount
    });

    // 构建每个表的查询
    const tableQueries = tables.map(table => {
      const fieldList = ['symbol', 'fiscalyear', 'period', ...fields]
        .map(f => f.toLowerCase())
        .join(', ');
      
      const query = `
        SELECT '${table}' as source_table, ${fieldList}
        FROM ${table}
        WHERE symbol = $1
        ORDER BY fiscalyear DESC, 
                 CASE period 
                   WHEN 'Q4' THEN 4 
                   WHEN 'Q3' THEN 3 
                   WHEN 'Q2' THEN 2 
                   WHEN 'Q1' THEN 1
                   WHEN 'FY' THEN 5
                 END DESC
        LIMIT $2
      `;
      
      console.log(`📝 Generated SQL query for ${table}:`, query.trim());
      return query;
    });

    // 执行所有查询并合并结果
    const allData: RawDataRow[] = [];
    
    for (let i = 0; i < tableQueries.length; i++) {
      const query = tableQueries[i];
      const table = tables[i];
      try {
        console.log(`⚡ Executing query for table ${table} with params:`, [symbol, periodCount * 2]);
        const result = await this.pool.query(query, [symbol, periodCount * 2]);
        console.log(`✅ Query result for ${table}: ${result.rows.length} rows`);
        if (result.rows.length > 0) {
          console.log(`📋 Sample row from ${table}:`, result.rows[0]);
        }
        allData.push(...result.rows);
      } catch (error) {
        console.error(`❌ Failed to fetch data from table ${table}:`, error);
      }
    }

    console.log(`📊 Fetched total ${allData.length} rows of raw data for ${symbol}`);
    if (allData.length > 0) {
      console.log(`📋 First few rows of combined data:`, allData.slice(0, 3));
    }
    return allData;
  }

  /**
   * 递归计算AST节点
   */
  private evaluateAST(node: any, rawData: RawDataRow[], asOfPeriod: string): number | null {
    if (!node || typeof node !== 'object') {
      throw new Error('Invalid AST node');
    }

    console.log(`🔍 Evaluating node type: ${node.type} for period: ${asOfPeriod}`);

    switch (node.type) {
      case 'constant':
        return node.value;

      case 'field':
        return this.evaluateField(node, rawData, asOfPeriod);

      case 'arithmetic':
        return this.evaluateArithmetic(node, rawData, asOfPeriod);

      case 'aggregation':
        return this.evaluateAggregation(node, rawData, asOfPeriod);

      case 'rolling_arithmetic':
        return this.evaluateRollingArithmetic(node, rawData, asOfPeriod);

      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  }

  /**
   * 计算字段值
   */
  private evaluateField(node: FieldNode, rawData: RawDataRow[], asOfPeriod: string): number | null {
    console.log(`📊 Evaluating field: ${node.source}.${node.field} for ${asOfPeriod}`);
    console.log(`📋 Available data rows: ${rawData.length}`);
    console.log(`🔍 Looking for data matching: source_table='${node.source}' AND period='${asOfPeriod}'`);

    // 显示所有相关数据行
    const relevantRows = rawData.filter(row => row.source_table === node.source);
    console.log(`🔍 Found ${relevantRows.length} rows from ${node.source} table:`);
    relevantRows.forEach((row, i) => {
      console.log(`  Row ${i}: ${row.fiscalyear}-${row.period} (${row.symbol})`);
    });

    if (node.selector?.type === 'rolling') {
      console.log(`🔄 Field uses rolling selector, delegating to calculateRollingField`);
      return this.calculateRollingField(node, rawData, asOfPeriod);
    }

    // Single period field
    const targetData = rawData.find(row => 
      row.source_table === node.source && 
      `${row.fiscalyear}-${row.period}` === asOfPeriod
    );

    if (!targetData) {
      console.warn(`⚠️ No data found for ${node.source}.${node.field} at ${asOfPeriod}`);
      console.warn(`   Available periods in ${node.source}: ${relevantRows.map(r => `${r.fiscalyear}-${r.period}`).join(', ')}`);
      return null;
    }

    const fieldKey = node.field.toLowerCase();
    const value = targetData[fieldKey];
    console.log(`✅ Found target data row:`, targetData);
    console.log(`✅ Field value: ${node.field} (${fieldKey}) = ${value}`);
    return value !== null ? parseFloat(value) : null;
  }

  /**
   * 计算rolling字段
   */
  private calculateRollingField(node: FieldNode, rawData: RawDataRow[], asOfPeriod: string): number | null {
    const rollingConfig = node.selector!.rolling!;

    // 过滤相关表的数据
    const tableData = rawData.filter(row => row.source_table === node.source);
    
    // 获取TTM数据
    const ttmValues = this.getTTMValues(
      tableData, 
      node.field.toLowerCase(), 
      asOfPeriod, 
      rollingConfig.window_size
    );

    console.log(`📈 TTM values for ${node.field}:`, ttmValues);

    if (ttmValues.length === 0) {
      console.warn(`⚠️ No TTM values found for ${node.field}`);
      return null;
    }

    // 应用聚合函数
    let result: number;
    switch (rollingConfig.aggregation) {
      case 'sum':
        result = ttmValues.reduce((sum, val) => sum + val, 0);
        break;
      case 'average':
        result = ttmValues.reduce((sum, val) => sum + val, 0) / ttmValues.length;
        break;
      case 'max':
        result = Math.max(...ttmValues);
        break;
      case 'min':
        result = Math.min(...ttmValues);
        break;
      default:
        throw new Error(`Unknown aggregation: ${rollingConfig.aggregation}`);
    }

    console.log(`✅ Rolling calculation result for ${node.field}: ${result} (${rollingConfig.aggregation} of [${ttmValues.join(', ')}])`);
    return result;
  }

  /**
   * 获取TTM值 (支持季度和年度rolling)
   */
  private getTTMValues(
    data: RawDataRow[], 
    field: string, 
    asOfPeriod: string, 
    windowSize: number
  ): number[] {
    // 解析asOf期间
    const [asOfYear, asOfPeriod_] = asOfPeriod.split('-');
    const asOfYearNum = parseInt(asOfYear);
    const asOfPeriodOrder = this.getPeriodOrder(asOfPeriod_);

    // 根据asOf期间类型决定数据筛选策略
    const isAsOfAnnual = asOfPeriod_ === 'FY';
    
    // 筛选符合时间条件的数据
    const eligibleData = data.filter(row => {
      const rowPeriodOrder = this.getPeriodOrder(row.period);
      
      if (isAsOfAnnual) {
        // 年度rolling：只保留年度数据，排除季度数据
        if (row.period !== 'FY') return false;
        return row.fiscalyear <= asOfYearNum;
      } else {
        // 季度rolling：只保留季度数据，排除年度数据  
        if (row.period === 'FY') return false;
        return (
          row.fiscalyear < asOfYearNum ||
          (row.fiscalyear === asOfYearNum && rowPeriodOrder <= asOfPeriodOrder)
        );
      }
    });

    // 按时间倒序排序
    eligibleData.sort((a, b) => {
      if (a.fiscalyear !== b.fiscalyear) return b.fiscalyear - a.fiscalyear;
      return this.getPeriodOrder(b.period) - this.getPeriodOrder(a.period);
    });

    // 取最近的windowSize个值
    const ttmData = eligibleData.slice(0, windowSize);

    const values = ttmData
      .map(row => {
        const val = row[field];
        console.log(`  ${row.fiscalyear}-${row.period}: ${field} = ${val}`);
        return val;
      })
      .filter(val => {
        const isValid = val !== null && val !== undefined;
        console.log(`    Value ${val} is valid: ${isValid}`);
        return isValid;
      })
      .map(val => {
        const parsed = parseFloat(val);
        console.log(`    Parsed ${val} to ${parsed}`);
        return parsed;
      });

    console.log(`🎯 Final TTM values: [${values.join(', ')}]`);
    return values;
  }

  /**
   * 计算算术运算
   */
  private evaluateArithmetic(node: ArithmeticNode, rawData: RawDataRow[], asOfPeriod: string): number | null {
    const left = this.evaluateAST(node.left, rawData, asOfPeriod);
    
    if (left === null) return null;

    // 单元运算
    if (!node.right) {
      switch (node.operator) {
        case 'abs': return Math.abs(left);
        case 'sqrt': return Math.sqrt(left);
        case 'log': return Math.log(left);
        case 'log10': return Math.log10(left);
        case 'round': return Math.round(left);
        default: throw new Error(`Unknown unary operator: ${node.operator}`);
      }
    }

    // 二元运算
    const right = this.evaluateAST(node.right, rawData, asOfPeriod);
    if (right === null) return null;

    switch (node.operator) {
      case 'add': return left + right;
      case 'subtract': return left - right;
      case 'multiply': return left * right;
      case 'divide': return right !== 0 ? left / right : null;
      case 'power': return Math.pow(left, right);
      default: throw new Error(`Unknown binary operator: ${node.operator}`);
    }
  }

  /**
   * 计算聚合函数
   */
  private evaluateAggregation(node: AggregationNode, rawData: RawDataRow[], asOfPeriod: string): number | null {
    const values = node.values
      .map(valueNode => this.evaluateAST(valueNode, rawData, asOfPeriod))
      .filter(val => val !== null) as number[];

    if (values.length === 0) return null;

    switch (node.function) {
      case 'sum': return values.reduce((sum, val) => sum + val, 0);
      case 'average': return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'max': return Math.max(...values);
      case 'min': return Math.min(...values);
      default: throw new Error(`Unknown aggregation function: ${node.function}`);
    }
  }

  /**
   * 计算rolling算术运算
   */
  private evaluateRollingArithmetic(node: RollingNode, rawData: RawDataRow[], asOfPeriod: string): number | null {
    // Rolling arithmetic: 对每个TTM期间执行operation，然后聚合
    const windowSize = node.rolling.window_size;
    const values: number[] = [];

    // 对每个TTM窗口中的期间执行operation
    for (let i = 0; i < windowSize; i++) {
      const periodValue = this.evaluateArithmetic(node.operation, rawData, asOfPeriod);
      if (periodValue !== null) values.push(periodValue);
    }

    if (values.length === 0) return null;

    // 应用rolling聚合
    switch (node.rolling.aggregation) {
      case 'sum': return values.reduce((sum, val) => sum + val, 0);
      case 'average': return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'max': return Math.max(...values);
      case 'min': return Math.min(...values);
      default: throw new Error(`Unknown rolling aggregation: ${node.rolling.aggregation}`);
    }
  }

  /**
   * 获取期间顺序
   */
  private getPeriodOrder(period: string): number {
    switch (period) {
      case 'Q1': return 1;
      case 'Q2': return 2;
      case 'Q3': return 3;
      case 'Q4': return 4;
      case 'FY': return 5;
      default: return 0;
    }
  }

}

// API Route Handlers
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    const authHeader = request.headers.get('Authorization');
    const isTestMode = authHeader === 'Bearer test-token' && process.env.NODE_ENV === 'development';
    
    if (!userId && !isTestMode) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CalculationRequest = await request.json();
    const { metricDefinition, symbols, periods = 5, periodType = 'quarter', asOf } = body;

    console.log(`📨 Simplified API Request:`, {
      metric: metricDefinition.name,
      symbols: symbols.length,
      periods,
      periodType
    });

    // Validate request
    if (!metricDefinition || !metricDefinition.ast) {
      return NextResponse.json(
        { error: 'Invalid metric definition: AST is required' },
        { status: 400 }
      );
    }

    if (!symbols || symbols.length === 0) {
      return NextResponse.json(
        { error: 'At least one symbol is required' },
        { status: 400 }
      );
    }

    // Create engine and calculate
    const engine = new SimplifiedFinancialEngine();
    const result = await engine.calculateMetric(metricDefinition, symbols, {
      periods,
      periodType,
      asOf
    });

    console.log(`✅ Simplified API Response completed`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Simplified API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        calculation_engine: 'SimplifiedFinancial_v1.0'
      },
      { status: 500 }
    );
  }
}