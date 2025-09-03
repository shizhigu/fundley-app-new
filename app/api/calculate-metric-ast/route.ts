import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Pool } from 'pg';

/**
 * Financial Metrics JSON AST Calculation API
 * 
 * This API processes JSON-based Abstract Syntax Trees to calculate
 * financial metrics directly from our PostgreSQL database.
 */

// AST Node Type Definitions
export type ASTNode = 
  | FieldNode 
  | ArithmeticNode 
  | AggregationNode 
  | ConditionalNode 
  | ConstantNode
  | RollingArithmeticNode;

export interface FieldNode {
  type: 'field';
  source: 'income_statement' | 'balance_sheet' | 'cash_flow_statement';
  field: string;
  selector: PeriodSelector;
}

export interface ArithmeticNode {
  type: 'arithmetic';
  operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'abs' | 'log' | 'log10' | 'round';
  left: ASTNode;
  right?: ASTNode;
}

export interface AggregationNode {
  type: 'aggregation';
  function: 'sum' | 'average' | 'max' | 'min' | 'ttm' | 'growth_rate';
  values: ASTNode[];
}

export interface ConditionalNode {
  type: 'conditional';
  condition: ComparisonNode;
  if_true: ASTNode;
  if_false: ASTNode;
}

export interface ConstantNode {
  type: 'constant';
  value: number;
}

export interface RollingArithmeticNode {
  type: 'rolling_arithmetic';
  operation: ArithmeticNode;
  rolling: {
    window_size: number;
    window_type: 'quarter' | 'year';
    from: 'latest';
    aggregation: 'sum' | 'average' | 'max' | 'min' | 'product' | 'geometric_mean';
  };
}

export interface ComparisonNode {
  type: 'comparison';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  left: ASTNode;
  right: ASTNode;
}

export interface PeriodSelector {
  type: 'single' | 'rolling';
  single?: {
    position: 'latest' | 'latest_annual' | 'specific';
    fiscalYear?: number;
    period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
    offset?: number; // -1 for previous quarter, -4 for same quarter last year
  };
  rolling?: {
    window_size: number;
    window_type: 'quarter' | 'year';
    from: 'latest';
    aggregation: 'sum' | 'average' | 'max' | 'min' | 'product' | 'geometric_mean';
  };
}

export interface MetricDefinition {
  name: string;
  description: string;
  formula_display: string;
  category: string;
  ast: ASTNode;
  data_requirements: {
    income_statement?: string[];
    balance_sheet?: string[];
    cash_flow_statement?: string[];
    periods_needed: string[];
  };
}

interface CalculationRequest {
  metricDefinition: MetricDefinition;
  symbols: string[];
  asOf?: string;
}

// Database connection pool
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
 * Financial Data Access Layer - Direct SQL Queries
 */
class FinancialDataAccess {
  private pool: Pool;
  private engine: FinancialASTEngine | null = null;

  constructor() {
    this.pool = getPool();
  }
  
  setEngine(engine: FinancialASTEngine) {
    this.engine = engine;
  }

  /**
   * Get field data based on period selector
   */
  async getFieldData(
    symbol: string,
    source: string,
    field: string,
    selector: PeriodSelector
  ): Promise<number | number[] | null> {
    
    switch (selector.type) {
      case 'single':
        return this.getSinglePeriodData(symbol, source, field, selector.single!);
      case 'rolling':
        return this.getRollingData(symbol, source, field, selector.rolling!);
      default:
        throw new Error(`Unsupported selector type: ${selector.type}`);
    }
  }

  private async getSinglePeriodData(
    symbol: string,
    source: string,
    field: string,
    config: NonNullable<PeriodSelector['single']>
  ): Promise<number | null> {
    
    let sql = `SELECT ${field.toLowerCase()} FROM ${source} WHERE symbol = $1`;
    const params: any[] = [symbol];
    let paramIndex = 2;

    // Handle specific fiscal year/period
    if (config.fiscalYear) {
      sql += ` AND fiscalyear = $${paramIndex}`;
      params.push(config.fiscalYear);
      paramIndex++;
    }

    if (config.period) {
      sql += ` AND period = $${paramIndex}`;
      params.push(config.period);
      paramIndex++;
    }

    // Add asOf time constraint for single period queries
    if (this.engine?.asOfDate && config.position === 'latest') {
      sql += ` AND (
        fiscalyear < $${paramIndex} OR 
        (fiscalyear = $${paramIndex} AND CASE period 
          WHEN 'FY' THEN 5
          WHEN 'Q4' THEN 4 
          WHEN 'Q3' THEN 3 
          WHEN 'Q2' THEN 2 
          WHEN 'Q1' THEN 1 
        END <= $${paramIndex + 1})
      )`;
      params.push(this.engine!.asOfDate!.year, this.engine!.asOfDate!.periodOrder);
      paramIndex += 2;
    }

    // Handle position and offset
    if (config.position === 'latest') {
      sql += ` ORDER BY fiscalyear DESC, 
               CASE period 
                 WHEN 'Q4' THEN 4 
                 WHEN 'Q3' THEN 3 
                 WHEN 'Q2' THEN 2 
                 WHEN 'Q1' THEN 1 
                 WHEN 'FY' THEN 5 
               END DESC`;
      
      // Handle offset
      if (config.offset && config.offset < 0) {
        const offsetValue = Math.abs(config.offset);
        sql += ` LIMIT 1 OFFSET ${offsetValue}`;
      } else {
        sql += ` LIMIT 1`;
      }
    }

    try {
      console.log(`🔍 Single period SQL with asOf constraint:`, sql);
      console.log(`🔍 SQL params:`, params);
      const result = await this.pool.query(sql, params);
      const value = result.rows[0]?.[field.toLowerCase()];
      return value !== undefined && value !== null ? parseFloat(value) : null;
    } catch (error) {
      console.error(`Error fetching ${field} from ${source}:`, error);
      return null;
    }
  }

  private async getRollingData(
    symbol: string,
    source: string,
    field: string,
    config: NonNullable<PeriodSelector['rolling']>
  ): Promise<number | null> {
    
    // Build the aggregation function based on config
    const aggregation = config.aggregation || 'sum'; // Default to sum for backward compatibility
    let aggregationSQL: string;
    
    switch (aggregation) {
      case 'sum':
        aggregationSQL = `SUM(${field.toLowerCase()}::numeric)`;
        break;
      case 'average':
        aggregationSQL = `AVG(${field.toLowerCase()}::numeric)`;
        break;
      case 'max':
        aggregationSQL = `MAX(${field.toLowerCase()}::numeric)`;
        break;
      case 'min':
        aggregationSQL = `MIN(${field.toLowerCase()}::numeric)`;
        break;
      case 'product':
        aggregationSQL = `EXP(SUM(LN(NULLIF(${field.toLowerCase()}::numeric, 0))))`;
        break;
      case 'geometric_mean':
        aggregationSQL = `EXP(AVG(LN(NULLIF(${field.toLowerCase()}::numeric, 0))))`;
        break;
      default:
        throw new Error(`Unsupported rolling aggregation: ${aggregation}`);
    }
    
    if (config.window_type === 'quarter') {
      // Build base SQL with optional asOf time constraint
      let whereClause = 'WHERE symbol = $1 AND period IN (\'Q1\', \'Q2\', \'Q3\', \'Q4\')';
      let params: any[] = [symbol];
      let paramIndex = 2;

      // Add asOf time constraint if specified
      if (this.engine?.asOfDate) {
        whereClause += ` AND (
          fiscalyear < $${paramIndex} OR 
          (fiscalyear = $${paramIndex} AND CASE period 
            WHEN 'Q4' THEN 4 
            WHEN 'Q3' THEN 3 
            WHEN 'Q2' THEN 2 
            WHEN 'Q1' THEN 1 
          END <= $${paramIndex + 1})
        )`;
        params.push(this.engine!.asOfDate!.year, this.engine!.asOfDate!.periodOrder);
        paramIndex += 2;
      }
      
      // Add window size at the end
      params.push(config.window_size);
      
      const sql = `
        SELECT ${aggregationSQL} as rolling_value
        FROM (
          SELECT ${field.toLowerCase()}
          FROM ${source}
          ${whereClause}
          ORDER BY fiscalyear DESC, 
                   CASE period 
                     WHEN 'Q4' THEN 4 
                     WHEN 'Q3' THEN 3 
                     WHEN 'Q2' THEN 2 
                     WHEN 'Q1' THEN 1 
                   END DESC
          LIMIT $${params.length}
        ) rolling_data
      `;
      
      try {
        console.log(`🔍 Rolling SQL with asOf constraint:`, sql);
        console.log(`🔍 SQL params:`, params);
        const result = await this.pool.query(sql, params);
        const value = result.rows[0]?.rolling_value;
        console.log(`🔍 Rolling ${aggregation} (${config.window_size} ${config.window_type}s): ${value}`);
        return value !== undefined && value !== null ? parseFloat(value) : null;
      } catch (error) {
        console.error(`Error calculating rolling ${aggregation} for ${field}:`, error);
        return null;
      }
    }

    return null;
  }
}

/**
 * Financial AST Calculation Engine
 */
export class FinancialASTEngine {
  private dataAccess: FinancialDataAccess;
  private asOfDate: { year: number; period: string; periodOrder: number } | null = null;

  constructor() {
    this.dataAccess = new FinancialDataAccess();
    this.dataAccess.setEngine(this);
  }

  /**
   * Parse asOf date string into structured format
   * Supports: "2019-Q3", "2020-Q1", "2020-FY"
   */
  private parseAsOfDate(asOfStr: string): { year: number; period: string; periodOrder: number } {
    const match = asOfStr.match(/^(\d{4})-(Q[1-4]|FY)$/);
    if (!match) {
      throw new Error(`Invalid asOf format: ${asOfStr}. Use format: YYYY-QN or YYYY-FY`);
    }

    const year = parseInt(match[1]);
    const period = match[2];
    
    // Convert period to order for comparison (Q1=1, Q2=2, Q3=3, Q4=4, FY=5)
    const periodOrder = period === 'FY' ? 5 : 
                       period === 'Q4' ? 4 :
                       period === 'Q3' ? 3 :
                       period === 'Q2' ? 2 : 1;

    return { year, period, periodOrder };
  }

  async calculateMetric(
    metric: MetricDefinition,
    symbols: string[],
    asOf?: string
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const symbol of symbols) {
      try {
        console.log(`🧮 Calculating ${metric.name} for ${symbol} using AST engine`);
        console.log(`🔍 AST structure:`, JSON.stringify(metric.ast, null, 2));
        
        if (!metric.ast) {
          throw new Error('Metric AST is null or undefined');
        }
        
        // Set the asOf context for this calculation
        this.asOfDate = asOf ? this.parseAsOfDate(asOf) : null;
        console.log(`🕒 AsOf context:`, this.asOfDate);
        
        const value = await this.evaluateNode(metric.ast, symbol);
        
        results[symbol] = {
          value: value,
          formula: metric.formula_display,
          calculation_method: 'JSON_AST_v1.0',
          timestamp: new Date().toISOString(),
          success: true
        };
        
        console.log(`✅ ${symbol} ${metric.name} = ${value}`);
        
      } catch (error) {
        console.error(`❌ Error calculating ${metric.name} for ${symbol}:`, error);
        results[symbol] = {
          error: `Calculation failed: ${error.message}`,
          value: null,
          success: false
        };
      }
    }

    return {
      metric_name: metric.name,
      results: results,
      calculation_engine: 'Financial_AST_SQL_v1.0'
    };
  }

  private async evaluateNode(node: ASTNode, symbol: string): Promise<number | null> {
    if (!node) {
      console.error('❌ evaluateNode: node is null or undefined');
      throw new Error('AST node is null or undefined');
    }
    
    if (!node.type) {
      console.error('❌ evaluateNode: node.type is undefined. Node:', JSON.stringify(node, null, 2));
      throw new Error('AST node type is undefined');
    }
    
    console.log(`🔍 Evaluating node type: ${node.type} for symbol: ${symbol}`);
    
    switch (node.type) {
      case 'field':
        return this.evaluateField(node, symbol);
      
      case 'arithmetic':
        return this.evaluateArithmetic(node, symbol);
      
      case 'aggregation':
        return this.evaluateAggregation(node, symbol);
      
      case 'conditional':
        return this.evaluateConditional(node, symbol);
      
      case 'constant':
        return node.value;
      
      case 'rolling_arithmetic':
        return this.evaluateRollingArithmetic(node, symbol);
      
      default:
        throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
  }

  private async evaluateField(node: FieldNode, symbol: string): Promise<number | null> {
    // Map common field names to database column names
    const fieldMappings: Record<string, string> = {
      'totalStockholderEquity': 'totalstockholdersequity',
      'totalStockholdersEquity': 'totalstockholdersequity',
      'netIncome': 'netincome'
    };
    
    const dbField = fieldMappings[node.field] || node.field;
    console.log(`🔍 Field mapping: ${node.field} -> ${dbField}`);
    
    return this.dataAccess.getFieldData(symbol, node.source, dbField, node.selector);
  }

  private async evaluateArithmetic(node: ArithmeticNode, symbol: string): Promise<number | null> {
    const left = await this.evaluateNode(node.left, symbol);
    
    if (left === null) return null;

    // Unary operations
    if (!node.right) {
      switch (node.operator) {
        case 'sqrt': return Math.sqrt(left);
        case 'abs': return Math.abs(left);
        case 'log': return Math.log(left);
        case 'log10': return Math.log10(left);
        case 'round': return Math.round(left);
        default: throw new Error(`Unknown unary operator: ${node.operator}`);
      }
    }

    // Binary operations
    const right = await this.evaluateNode(node.right, symbol);
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

  private async evaluateAggregation(node: AggregationNode, symbol: string): Promise<number | null> {
    const values = await Promise.all(
      node.values.map(valueNode => this.evaluateNode(valueNode, symbol))
    );

    const validValues = values.filter(v => v !== null) as number[];
    if (validValues.length === 0) return null;

    switch (node.function) {
      case 'sum':
        return validValues.reduce((sum, val) => sum + val, 0);
      
      case 'average':
        return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
      
      case 'max':
        return Math.max(...validValues);
      
      case 'min':
        return Math.min(...validValues);
      
      default:
        throw new Error(`Unknown aggregation function: ${node.function}`);
    }
  }

  private async evaluateConditional(node: ConditionalNode, symbol: string): Promise<number | null> {
    const conditionResult = await this.evaluateComparison(node.condition, symbol);
    
    if (conditionResult) {
      return this.evaluateNode(node.if_true, symbol);
    } else {
      return this.evaluateNode(node.if_false, symbol);
    }
  }

  private async evaluateComparison(node: ComparisonNode, symbol: string): Promise<boolean> {
    const left = await this.evaluateNode(node.left, symbol);
    const right = await this.evaluateNode(node.right, symbol);

    if (left === null || right === null) return false;

    switch (node.operator) {
      case 'gt': return left > right;
      case 'lt': return left < right;
      case 'gte': return left >= right;
      case 'lte': return left <= right;
      case 'eq': return left === right;
      case 'ne': return left !== right;
      default: throw new Error(`Unknown comparison operator: ${node.operator}`);
    }
  }

  private async evaluateRollingArithmetic(node: RollingArithmeticNode, symbol: string): Promise<number | null> {
    console.log(`🔍 Rolling Arithmetic: ${node.rolling.aggregation} over ${node.rolling.window_size} ${node.rolling.window_type}s`);
    
    // Calculate the operation for each period in the rolling window
    const values: (number | null)[] = [];
    
    for (let offset = 0; offset < node.rolling.window_size; offset++) {
      // Create modified operation nodes for each period
      const periodOperation: ArithmeticNode = {
        ...node.operation,
        left: this.addOffsetToNode(node.operation.left, -offset),
        right: node.operation.right ? this.addOffsetToNode(node.operation.right, -offset) : undefined
      };
      
      const periodValue = await this.evaluateArithmetic(periodOperation, symbol);
      values.push(periodValue);
      console.log(`🔍 Period -${offset}: ${periodValue}`);
    }
    
    // Apply aggregation to the calculated values
    const validValues = values.filter(v => v !== null) as number[];
    if (validValues.length === 0) return null;
    
    let result: number;
    switch (node.rolling.aggregation) {
      case 'sum':
        result = validValues.reduce((sum, val) => sum + val, 0);
        break;
      case 'average':
        result = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        break;
      case 'max':
        result = Math.max(...validValues);
        break;
      case 'min':
        result = Math.min(...validValues);
        break;
      case 'product':
        result = validValues.reduce((prod, val) => prod * val, 1);
        break;
      case 'geometric_mean':
        const product = validValues.reduce((prod, val) => prod * val, 1);
        result = Math.pow(product, 1 / validValues.length);
        break;
      default:
        throw new Error(`Unknown rolling aggregation: ${node.rolling.aggregation}`);
    }
    
    console.log(`🔍 Rolling ${node.rolling.aggregation} result: ${result}`);
    return result;
  }
  
  private addOffsetToNode(node: ASTNode, offset: number): ASTNode {
    if (node.type === 'field') {
      return {
        ...node,
        selector: {
          type: 'single',
          single: {
            position: 'latest',
            offset: offset
          }
        }
      };
    }
    
    if (node.type === 'arithmetic') {
      return {
        ...node,
        left: this.addOffsetToNode(node.left, offset),
        right: node.right ? this.addOffsetToNode(node.right, offset) : undefined
      };
    }
    
    // For other node types, return as-is
    return node;
  }
}

// API Route Handlers
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CalculationRequest = await request.json();
    const { metricDefinition, symbols, asOf } = body;

    if (!metricDefinition || !symbols || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: metricDefinition and symbols' },
        { status: 400 }
      );
    }

    console.log(`🚀 AST calculation request: ${metricDefinition.name} for [${symbols.join(', ')}]`);

    console.log(`🕒 AsOf parameter:`, asOf);
    
    const engine = new FinancialASTEngine();
    const results = await engine.calculateMetric(metricDefinition, symbols, asOf);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('AST calculation error:', error);
    return NextResponse.json(
      { 
        error: 'Metric calculation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}