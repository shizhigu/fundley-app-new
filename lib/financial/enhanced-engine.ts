import { motherDuckAPI } from '@/lib/motherduck/api-client';

/**
 * MotherDuck API Client for Enhanced Engine
 * 使用部署在Render的Python FastAPI服务
 */
class MotherDuckClient {
  async query(sql: string): Promise<any[]> {
    console.log('🦆 Enhanced Engine: Executing SQL via MotherDuck API:', sql);
    const result = await motherDuckAPI.query(sql);
    console.log(`✅ Enhanced Engine: MotherDuck API query completed: ${result.length} rows`);
    return result;
  }
  
  async close(): Promise<void> {
    console.log('🦆 Enhanced Engine: MotherDuck API client - no cleanup needed');
  }
}

// Enhanced Types
export interface MetricDefinition {
  name: string;
  description?: string;
  formula_display?: string;
  category?: string;
  ast: any;
  data_requirements?: {
    [table: string]: string[] | undefined;
    periods_needed?: string[];
  };
}

export interface CalculationRequest {
  metricDefinition: MetricDefinition;
  symbols: string[];
  periods?: number;
  periodType?: 'quarter' | 'annual';
  asOf?: string;
}

export interface MarketScanRequest {
  metricDefinition: MetricDefinition;
  filters?: {
    marketCap?: [number, number];
    sector?: string[];
    exchange?: string[];
    minValue?: number;
    maxValue?: number;
  };
  topN?: number;
  sortBy?: 'desc' | 'asc';
  periodType?: 'quarter' | 'annual';
  asOf?: string;
}

export interface MarketScanResult {
  metric: string;
  results: Array<{
    symbol: string;
    value: number;
    rank: number;
    company_name?: string;
    sector?: string;
    market_cap?: number;
  }>;
  metadata: {
    totalScanned: number;
    validResults: number;
    executionTime: number;
    sql: string;
    calculatedAt: string;
  };
}

// AST Node Types - 标准格式
export type ASTNode = 
  | FieldNode 
  | ArithmeticNode 
  | AggregationNode 
  | ConditionalNode 
  | ConstantNode 
  | RollingNode;

export interface FieldNode {
  type: 'field';
  source: string;
  field: string;
  selector?: {
    type: 'rolling' | 'single';
    rolling?: {
      window_size: number;
      window_type: 'quarter' | 'annual';
      from: 'latest';
      aggregation: 'sum' | 'average' | 'latest' | 'change';
    };
    single?: {
      position: 'latest';
      offset?: number;
    };
  };
}

export interface ArithmeticNode {
  type: 'arithmetic';
  operator: 'divide' | 'add' | 'subtract' | 'multiply' | 'abs';
  left: ASTNode;
  right: ASTNode;
}

export interface AggregationNode {
  type: 'aggregation';
  function: 'sum' | 'average' | 'max' | 'min' | 'ttm';
  values: ASTNode[];
}

export interface ConditionalNode {
  type: 'conditional';
  condition: {
    left: ASTNode;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains';
    right: ASTNode;
  };
  then: ASTNode;
  else: ASTNode;
}

export interface ConstantNode {
  type: 'constant';
  value: number;
}

export interface RollingNode {
  type: 'rolling';
  operation: 'sum' | 'average' | 'change';
  operand: ASTNode;
  periods: number;
}

/**
 * Enhanced Financial Engine with DuckDB + Market Scanning
 */
export class EnhancedFinancialEngine {
  private client: MotherDuckClient | null = null;
  private dbName = 'financial_db';

  constructor() {
    // Lazy initialization - client will be created when first needed
  }

  private getClient(): MotherDuckClient {
    if (!this.client) {
      this.client = new MotherDuckClient();
    }
    return this.client;
  }

  /**
   * 智能计算：小批量用原逻辑，大批量用市场扫描
   */
  async calculateMetric(request: CalculationRequest): Promise<any> {
    const { symbols, metricDefinition } = request;
    
    console.log(`🚀 Enhanced calculation for ${symbols.length} symbols`);
    
    // 决策：超过100个symbols使用市场扫描
    if (symbols.length > 100) {
      console.log(`📊 Large batch detected, using market scanner`);
      return this.scanMarket({
        metricDefinition,
        filters: { 
          // Convert symbols to filter - this is a simplification
          // In real implementation, might need symbol-specific filtering
        },
        topN: symbols.length,
        periodType: request.periodType,
        asOf: request.asOf
      });
    } else {
      console.log(`📊 Small batch, using individual calculation`);
      return this.calculateBatch(request);
    }
  }

  /**
   * 全市场扫描 - 核心新功能
   */
  async scanMarket(request: MarketScanRequest): Promise<MarketScanResult> {
    const startTime = Date.now();
    const { metricDefinition, filters, topN = 100, sortBy = 'desc', periodType = 'quarter', asOf } = request;

    console.log(`🌍 Starting market scan for metric: ${metricDefinition.name}`);
    console.log(`🎯 Filters:`, filters);

    try {
      // 1. AST → SQL 转换
      const sql = this.astToSQL(metricDefinition.ast, {
        filters,
        topN,
        sortBy,
        periodType,
        asOf
      });

      console.log(`🔧 Generated SQL:`, sql);

      // 2. 执行DuckDB查询
      const results = await this.getClient().query(sql);
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Market scan completed: ${results.length} results in ${executionTime}ms`);

      return {
        metric: metricDefinition.name,
        results: results.map((row: any, index: number) => ({
          symbol: row.symbol,
          value: parseFloat(row.metric_value),
          rank: index + 1,
          company_name: row.company_name,
          sector: row.sector,
          market_cap: row.market_cap
        })),
        metadata: {
          totalScanned: results.length,
          validResults: results.filter((r: any) => r.metric_value !== null).length,
          executionTime,
          sql,
          calculatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Market scan error:', error);
      throw error;
    }
  }

  /**
   * AST → DuckDB SQL 转换器 - 核心算法
   */
  private astToSQL(ast: ASTNode, options: {
    filters?: MarketScanRequest['filters'];
    topN?: number;
    sortBy?: 'desc' | 'asc';
    periodType?: 'quarter' | 'annual';
    asOf?: string;
  }): string {
    const { filters, topN, sortBy, periodType, asOf } = options;

    // 1. 递归转换AST为SQL表达式
    const metricExpression = this.astNodeToSQL(ast);

    // 2. 构建时间过滤条件
    const timeFilter = this.buildTimeFilter(periodType, asOf);

    // 3. 构建市场过滤条件
    const marketFilters = this.buildMarketFilters(filters);

    // 4. 构建完整SQL - DuckDB优化版本
    const sql = `
      WITH latest_financial_data AS (
        SELECT DISTINCT
          i.symbol,
          i.symbol as company_name,
          '' as sector,
          0 as market_cap,
          -- 获取最新财务数据，使用FIRST_VALUE窗口函数
          FIRST_VALUE(i.revenue) OVER (PARTITION BY i.symbol ORDER BY i.fiscalYear DESC, i.period DESC) as revenue,
          FIRST_VALUE(i.netIncome) OVER (PARTITION BY i.symbol ORDER BY i.fiscalYear DESC, i.period DESC) as netincome,
          FIRST_VALUE(i.grossProfit) OVER (PARTITION BY i.symbol ORDER BY i.fiscalYear DESC, i.period DESC) as grossprofit,
          FIRST_VALUE(i.operatingIncome) OVER (PARTITION BY i.symbol ORDER BY i.fiscalYear DESC, i.period DESC) as operatingincome,
          FIRST_VALUE(i.ebit) OVER (PARTITION BY i.symbol ORDER BY i.fiscalYear DESC, i.period DESC) as ebit,
          
          FIRST_VALUE(b.totalAssets) OVER (PARTITION BY i.symbol ORDER BY b.fiscalYear DESC, b.period DESC) as totalassets,
          FIRST_VALUE(b.totalStockholdersEquity) OVER (PARTITION BY i.symbol ORDER BY b.fiscalYear DESC, b.period DESC) as totalequity,
          FIRST_VALUE(b.totalDebt) OVER (PARTITION BY i.symbol ORDER BY b.fiscalYear DESC, b.period DESC) as totaldebt,
          FIRST_VALUE(b.totalCurrentLiabilities) OVER (PARTITION BY i.symbol ORDER BY b.fiscalYear DESC, b.period DESC) as totalcurrentliabilities,
          FIRST_VALUE(b.totalCurrentAssets) OVER (PARTITION BY i.symbol ORDER BY b.fiscalYear DESC, b.period DESC) as currentassets,
          
          FIRST_VALUE(cf.operatingcashflow) OVER (PARTITION BY i.symbol ORDER BY cf.fiscalyear DESC, cf.period DESC) as operatingcashflow,
          FIRST_VALUE(cf.freecashflow) OVER (PARTITION BY i.symbol ORDER BY cf.fiscalyear DESC, cf.period DESC) as freecashflow,
          FIRST_VALUE(cf.capitalexpenditure) OVER (PARTITION BY i.symbol ORDER BY cf.fiscalyear DESC, cf.period DESC) as capitalexpenditure
        FROM income_statement i
        LEFT JOIN balance_sheet b ON i.symbol = b.symbol AND i.fiscalyear = b.fiscalyear AND i.period = b.period  
        LEFT JOIN cash_flow_statement cf ON i.symbol = cf.symbol AND i.fiscalyear = cf.fiscalyear AND i.period = cf.period
        WHERE 1=1
          ${timeFilter}
      ),
      calculated_metrics AS (
        SELECT 
          symbol,
          company_name,
          sector,
          market_cap,
          ${metricExpression} as metric_value
        FROM latest_financial_data
        WHERE ${metricExpression} IS NOT NULL
          AND ${metricExpression} != 0
          AND ${metricExpression} != 'inf'::DOUBLE
          AND ${metricExpression} != '-inf'::DOUBLE
          AND ${metricExpression} != 'nan'::DOUBLE
      )
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY metric_value ${sortBy}) as rank
      FROM calculated_metrics
      ORDER BY metric_value ${sortBy}
      ${topN ? `LIMIT ${topN}` : ''}
    `;

    return sql;
  }

  /**
   * 递归转换AST节点为SQL表达式
   */
  private astNodeToSQL(node: ASTNode): string {
    switch (node.type) {
      case 'constant':
        return node.value.toString();

      case 'field':
        return this.fieldToSQL(node);

      case 'arithmetic':
        const left = this.astNodeToSQL(node.left);
        const right = this.astNodeToSQL(node.right);
        
        if (node.operator === 'abs') {
          return `ABS(${left})`;
        }
        
        const operator = this.getOperatorSQL(node.operator);
        return `(${left} ${operator} ${right})`;

      case 'aggregation':
        return this.aggregationToSQL(node);

      case 'rolling':
        return this.rollingToSQL(node);

      case 'conditional':
        const condition = this.conditionToSQL(node.condition);
        const thenExpr = this.astNodeToSQL(node.then);
        const elseExpr = this.astNodeToSQL(node.else);
        return `CASE WHEN ${condition} THEN ${thenExpr} ELSE ${elseExpr} END`;

      default:
        throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
  }

  /**
   * 字段节点转SQL
   */
  private fieldToSQL(node: FieldNode): string {
    const fieldName = node.field.toLowerCase();
    
    // 处理rolling selector
    if (node.selector?.type === 'rolling') {
      const rolling = node.selector.rolling!;
      const windowSize = rolling.window_size;
      
      switch (rolling.aggregation) {
        case 'sum':
          return `SUM(${fieldName}) OVER (PARTITION BY symbol ORDER BY fiscalyear, period ROWS ${windowSize - 1} PRECEDING)`;
        case 'average':
          return `AVG(${fieldName}) OVER (PARTITION BY symbol ORDER BY fiscalyear, period ROWS ${windowSize - 1} PRECEDING)`;
        case 'latest':
          return fieldName;
        case 'change':
          return `${fieldName} - LAG(${fieldName}, ${windowSize - 1}) OVER (PARTITION BY symbol ORDER BY fiscalyear, period)`;
        default:
          return fieldName;
      }
    }
    
    // 处理offset
    if (node.selector?.single?.offset) {
      const offset = Math.abs(node.selector.single.offset);
      return `LAG(${fieldName}, ${offset}) OVER (PARTITION BY symbol ORDER BY fiscalyear, period)`;
    }
    
    return fieldName;
  }

  /**
   * 聚合节点转SQL
   */
  private aggregationToSQL(node: AggregationNode): string {
    const expressions = node.values.map(v => this.astNodeToSQL(v));
    
    switch (node.function) {
      case 'sum':
      case 'ttm':
        return `(${expressions.join(' + ')})`;
      case 'average':
        return `(${expressions.join(' + ')}) / ${expressions.length}`;
      case 'max':
        return `GREATEST(${expressions.join(', ')})`;
      case 'min':
        return `LEAST(${expressions.join(', ')})`;
      default:
        throw new Error(`Unknown aggregation function: ${node.function}`);
    }
  }

  /**
   * Rolling节点转SQL
   */
  private rollingToSQL(node: RollingNode): string {
    const operand = this.astNodeToSQL(node.operand);
    const periods = node.periods;
    
    switch (node.operation) {
      case 'sum':
        return `SUM(${operand}) OVER (PARTITION BY symbol ORDER BY fiscalyear, period ROWS ${periods - 1} PRECEDING)`;
      case 'average':
        return `AVG(${operand}) OVER (PARTITION BY symbol ORDER BY fiscalyear, period ROWS ${periods - 1} PRECEDING)`;
      case 'change':
        return `${operand} - LAG(${operand}, ${periods - 1}) OVER (PARTITION BY symbol ORDER BY fiscalyear, period)`;
      default:
        throw new Error(`Unknown rolling operation: ${node.operation}`);
    }
  }

  /**
   * 条件转SQL
   */
  private conditionToSQL(condition: ConditionalNode['condition']): string {
    const left = this.astNodeToSQL(condition.left);
    const right = this.astNodeToSQL(condition.right);
    
    switch (condition.operator) {
      case '>': return `${left} > ${right}`;
      case '<': return `${left} < ${right}`;
      case '>=': return `${left} >= ${right}`;
      case '<=': return `${left} <= ${right}`;
      case '==': return `${left} = ${right}`;
      case '!=': return `${left} != ${right}`;
      case 'contains': return `${left} LIKE '%' || ${right} || '%'`;
      default:
        throw new Error(`Unknown condition operator: ${condition.operator}`);
    }
  }

  /**
   * 算术操作符转SQL
   */
  private getOperatorSQL(operator: ArithmeticNode['operator']): string {
    switch (operator) {
      case 'add': return '+';
      case 'subtract': return '-';
      case 'multiply': return '*';
      case 'divide': return '/';
      default:
        throw new Error(`Unknown arithmetic operator: ${operator}`);
    }
  }

  /**
   * 构建时间过滤条件
   */
  private buildTimeFilter(periodType?: 'quarter' | 'annual', asOf?: string): string {
    let timeFilter = '';
    
    if (periodType === 'annual') {
      timeFilter += ` AND i.period = 'FY'`;
    } else {
      timeFilter += ` AND i.period IN ('Q1', 'Q2', 'Q3', 'Q4')`;
    }
    
    if (asOf) {
      const [year, period] = asOf.split('-');
      timeFilter += ` AND i.fiscalyear <= ${year}`;
      
      if (periodType !== 'annual' && period !== 'FY') {
        const periodOrder = this.getPeriodOrder(period);
        timeFilter += ` AND (i.fiscalyear < ${year} OR (i.fiscalyear = ${year} AND ${this.getPeriodOrderSQL('i.period')} <= ${periodOrder}))`;
      }
    }
    
    return timeFilter;
  }

  /**
   * 构建市场过滤条件
   */
  private buildMarketFilters(filters?: MarketScanRequest['filters']): string {
    if (!filters) return '';
    
    let conditions: string[] = [];
    
    if (filters.marketCap) {
      const [min, max] = filters.marketCap;
      conditions.push(`c.market_cap BETWEEN ${min} AND ${max}`);
    }
    
    if (filters.sector && filters.sector.length > 0) {
      const sectors = filters.sector.map(s => `'${s}'`).join(',');
      conditions.push(`c.sector IN (${sectors})`);
    }
    
    if (filters.exchange && filters.exchange.length > 0) {
      const exchanges = filters.exchange.map(e => `'${e}'`).join(',');
      conditions.push(`c.exchange IN (${exchanges})`);
    }
    
    return conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
  }

  /**
   * 期间排序SQL
   */
  private getPeriodOrderSQL(periodColumn: string): string {
    return `CASE ${periodColumn} WHEN 'Q1' THEN 1 WHEN 'Q2' THEN 2 WHEN 'Q3' THEN 3 WHEN 'Q4' THEN 4 WHEN 'FY' THEN 5 ELSE 0 END`;
  }

  /**
   * 期间排序数值
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

  /**
   * 小批量计算（保留原逻辑）
   */
  private async calculateBatch(request: CalculationRequest): Promise<any> {
    // 这里可以保留原来的逻辑，或者用简化的SQL查询
    // 为了简化，我们也用SQL方式处理小批量
    const scanRequest: MarketScanRequest = {
      metricDefinition: request.metricDefinition,
      topN: request.symbols.length,
      periodType: request.periodType,
      asOf: request.asOf
      // TODO: 需要将symbols转换为过滤条件
    };
    
    return this.scanMarket(scanRequest);
  }

  /**
   * 关闭MotherDuck连接
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}