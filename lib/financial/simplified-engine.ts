import { Pool } from 'pg';

/**
 * Database configuration for financial data
 */
function getPool(): Pool {
  // 优先使用完整的连接字符串
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  
  // 回退到分开的环境变量
  return new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DATABASE || 'financial_data',
    password: process.env.POSTGRES_PASSWORD || '',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Types
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
    type: 'rolling';
    rolling: {
      window_size: number;
      window_type: 'quarter' | 'annual';
      from: 'latest';
      aggregation: 'sum' | 'average' | 'latest' | 'change';
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

interface RawDataRow {
  source_table: string;
  symbol: string;
  fiscalyear: number;
  period: string;
  [key: string]: any;
}

/**
 * 简化版本的财务计算引擎
 */
export class SimplifiedFinancialEngine {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * 计算多个symbols的指标
   */
  async calculateMetric(request: CalculationRequest): Promise<any> {
    const { metricDefinition, symbols, periods = 4, periodType = 'quarter', asOf } = request;

    console.log(`🚀 Starting calculation for ${symbols.length} symbols`);
    console.log(`📊 Metric: ${metricDefinition.name}`);
    console.log(`📅 Periods: ${periods} ${periodType}s`);

    try {
      // 1. 从AST提取数据需求
      const dataRequirements = this.extractDataRequirements(metricDefinition.ast);
      console.log('📋 Data requirements:', dataRequirements);

      // 2. 批量获取原始数据
      const rawData = await this.fetchRawData(symbols, dataRequirements, periods, periodType, asOf);
      console.log(`📊 Retrieved ${rawData.length} data rows`);

      // 3. 并发计算每个symbol
      const results = await Promise.all(
        symbols.map(symbol => this.calculateSymbolMetric(symbol, metricDefinition.ast, rawData, periods, periodType, asOf))
      );

      return {
        metric: metricDefinition.name,
        symbols: symbols.map((symbol, i) => ({
          symbol,
          values: results[i]
        })),
        metadata: {
          periods,
          periodType,
          asOf,
          calculatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Calculation error:', error);
      throw error;
    }
  }

  /**
   * 从AST递归提取数据需求 - 支持legacy和新格式
   */
  private extractDataRequirements(node: ASTNode): { tables: Set<string>, fields: Set<string> } {
    const requirements = { tables: new Set<string>(), fields: new Set<string>() };

    const traverse = (n: any) => {
      if (!n || typeof n !== 'object') {
        console.warn('⚠️ Invalid AST node:', n);
        return;
      }

      switch (n.type) {
        case 'field':
          if (n.source && n.field) {
            requirements.tables.add(n.source);
            requirements.fields.add(`${n.source}.${n.field}`);
          }
          break;
        case 'arithmetic':
          if (n.left) traverse(n.left);
          if (n.right) traverse(n.right);
          break;
        case 'aggregation':
          // 新的aggregation结构使用values数组
          if (n.values && Array.isArray(n.values)) {
            n.values.forEach(traverse);
          }
          break;
        case 'rolling':
          if (n.operand) traverse(n.operand);
          break;
        case 'conditional':
          if (n.condition?.left) traverse(n.condition.left);
          if (n.condition?.right) traverse(n.condition.right);
          if (n.then) traverse(n.then);
          if (n.else) traverse(n.else);
          break;
        case 'constant':
          // No requirements for constants
          break;
      }
    };

    traverse(node);
    return requirements;
  }

  /**
   * 批量获取原始数据
   */
  private async fetchRawData(
    symbols: string[],
    requirements: { tables: Set<string>, fields: Set<string> },
    periods: number,
    periodType: 'quarter' | 'annual',
    asOf?: string
  ): Promise<RawDataRow[]> {
    const tables = Array.from(requirements.tables);
    const symbolList = symbols.map(s => `'${s}'`).join(',');

    // 构建WHERE条件
    let whereConditions = [`symbol IN (${symbolList})`];
    
    if (periodType === 'annual') {
      whereConditions.push(`period = 'FY'`);
    } else {
      whereConditions.push(`period IN ('Q1', 'Q2', 'Q3', 'Q4')`);
    }

    if (asOf) {
      const [year, period] = asOf.split('-');
      if (periodType === 'annual') {
        whereConditions.push(`fiscalyear <= ${year}`);
      } else {
        whereConditions.push(`(fiscalyear < ${year} OR (fiscalyear = ${year} AND ${this.getPeriodOrder(period)} <= ${this.getPeriodOrder(period)}))`);
      }
    }

    // 限制期间数量
    const orderBy = 'fiscalyear DESC, period DESC';
    const limitClause = `LIMIT ${periods * symbols.length * (periodType === 'annual' ? 1 : 4)}`;

    // 简化方案：为每个表单独查询，然后在应用层合并
    // 这样避免了UNION的列数匹配问题
    const allResults: any[] = [];
    
    for (const table of tables) {
      const whereClause = whereConditions.join(' AND ');
      const tableNameLower = table.toLowerCase();
      
      const query = `
        SELECT '${table}' as source_table, *
        FROM ${tableNameLower}
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ${periods * symbols.length * (periodType === 'annual' ? 1 : 4)}
      `;
      
      console.log(`🔍 Executing query for ${table}:`, query);
      
      try {
        const result = await this.pool.query(query);
        console.log(`📊 Table '${table}' returned ${result.rows.length} rows`);
        allResults.push(...result.rows);
      } catch (error) {
        console.error(`❌ Query failed for table '${table}':`, error instanceof Error ? error.message : 'Unknown error');
        // 继续处理其他表
      }
    }
    
    console.log(`📊 Total combined results: ${allResults.length} rows`);
    
    // 调试：按表统计返回的行数
    const tableStats: Record<string, number> = {};
    allResults.forEach((row: any) => {
      const table = row.source_table;
      tableStats[table] = (tableStats[table] || 0) + 1;
    });
    console.log(`📊 Rows per table:`, tableStats);
    
    return allResults;
  }

  /**
   * 计算单个symbol的指标
   */
  private async calculateSymbolMetric(
    symbol: string,
    ast: ASTNode,
    rawData: RawDataRow[],
    periods: number,
    periodType: 'quarter' | 'annual',
    asOf?: string
  ): Promise<Array<{ period: string, value: number | null }>> {
    const symbolData = rawData.filter(row => row.symbol === symbol);
    
    // 获取该symbol的所有可用期间
    const availablePeriods = this.getAvailablePeriods(symbolData, periodType);
    console.log(`📅 Available periods for ${symbol}:`, availablePeriods);

    // 限制到请求的期间数量
    const targetPeriods = availablePeriods.slice(0, periods);

    // 计算每个期间的值
    const results = [];
    for (const period of targetPeriods) {
      try {
        const value = this.evaluateAST(ast, symbolData, period);
        results.push({ period, value });
        console.log(`✅ ${symbol} ${period}: ${value}`);
      } catch (error) {
        console.warn(`⚠️ Error calculating ${symbol} ${period}:`, error);
        results.push({ period, value: null });
      }
    }

    return results;
  }

  /**
   * 获取可用期间列表
   */
  private getAvailablePeriods(data: RawDataRow[], periodType: 'quarter' | 'annual'): string[] {
    const periods = new Set<string>();
    
    data.forEach(row => {
      if (periodType === 'annual' && row.period === 'FY') {
        periods.add(`${row.fiscalyear}-FY`);
      } else if (periodType === 'quarter' && ['Q1', 'Q2', 'Q3', 'Q4'].includes(row.period)) {
        periods.add(`${row.fiscalyear}-${row.period}`);
      }
    });

    return Array.from(periods).sort().reverse();
  }

  /**
   * 递归评估AST节点
   */
  private evaluateAST(node: any, rawData: RawDataRow[], asOfPeriod: string): number | null {
    if (!node || typeof node !== 'object') {
      console.warn(`⚠️ Invalid AST node:`, node);
      return null;
    }

    console.log(`🔍 Evaluating AST node:`, { type: node.type, asOfPeriod });

    switch (node.type) {
      case 'constant':
        return typeof node.value === 'number' ? node.value : null;

      case 'field':
        return this.evaluateField(node, rawData, asOfPeriod);

      case 'arithmetic':
        const left = this.evaluateAST(node.left, rawData, asOfPeriod);
        const right = this.evaluateAST(node.right, rawData, asOfPeriod);
        
        if (node.operator === 'abs') {
          // Special case for absolute value - only use left operand
          return left !== null ? Math.abs(left) : null;
        }
        
        if (left === null || right === null) return null;
        
        switch (node.operator) {
          case 'add':
            return left + right;
          case 'subtract':
            return left - right;
          case 'multiply':
            return left * right;
          case 'divide':
            return right !== 0 ? left / right : null;
          default:
            console.warn(`⚠️ Unknown operator: ${node.operator}`);
            return null;
        }

      case 'rolling':
        return this.evaluateRolling(node, rawData, asOfPeriod);

      case 'aggregation':
        return this.evaluateAggregation(node, rawData, asOfPeriod);

      case 'conditional':
        const conditionResult = this.evaluateCondition(node.condition, rawData, asOfPeriod);
        return conditionResult ? 
          this.evaluateAST(node.then, rawData, asOfPeriod) : 
          this.evaluateAST(node.else, rawData, asOfPeriod);

      default:
        console.warn(`⚠️ Unknown AST node type: ${node.type}`);
        return null;
    }
  }


  /**
   * 评估字段节点
   */
  private evaluateField(node: any, rawData: RawDataRow[], asOfPeriod: string): number | null {
    console.log(`🔍 Evaluating field: ${node.source}.${node.field} at ${asOfPeriod}`);
    
    // 调试：显示rawData的总体信息
    console.log(`📊 Total rawData rows: ${rawData.length}`);
    if (rawData.length > 0) {
      // console.log(`📊 Sample rawData (first 2 rows):`, rawData.slice(0, 2).map(row => ({
      //   source_table: row.source_table,
      //   symbol: row.symbol,
      //   fiscalyear: row.fiscalyear,
      //   period: row.period
      // })));
      console.log(`📊 Unique source_tables in rawData:`, [...new Set(rawData.map(r => r.source_table))]);
    }
    
    // 过滤相关数据
    const relevantRows = rawData.filter(row => 
      row.source_table === node.source && 
      row.symbol // 应该有symbol，但为了安全起见
    );

    console.log(`📊 Found ${relevantRows.length} relevant rows for ${node.source}`);
    console.log(`📊 Sample data for debugging:`, relevantRows.slice(0, 3).map(row => ({
      fiscalyear: row.fiscalyear,
      period: row.period,
      [node.field.toLowerCase()]: row[node.field.toLowerCase()]
    })));

    // Check for rolling selector
    if (node.selector?.type === 'rolling') {
      console.log(`🔄 Field uses rolling selector, delegating to calculateRollingField`);
      return this.calculateRollingField(node, rawData, asOfPeriod);
    }

    // Single period field with offset support
    let targetPeriod = asOfPeriod;
    
    // 处理offset逻辑
    if (node.selector?.single?.offset) {
      const offset = node.selector.single.offset;
      console.log(`🔍 Applying offset ${offset} to period ${asOfPeriod}`);
      targetPeriod = this.calculateOffsetPeriod(asOfPeriod, offset);
      console.log(`🔍 Target period after offset: ${targetPeriod}`);
    }
    
    console.log(`🔍 Searching for period: ${targetPeriod} in source: ${node.source}`);
    
    const targetData = rawData.find(row => {
      const matches = row.source_table === node.source && 
                     `${row.fiscalyear}-${row.period}` === targetPeriod;
      
      if (matches) {
        console.log(`✅ Found matching row:`, {
          source_table: row.source_table,
          period: `${row.fiscalyear}-${row.period}`,
          hasField: row.hasOwnProperty(node.field.toLowerCase()),
          fieldValue: row[node.field.toLowerCase()]
        });
      }
      
      return matches;
    });

    if (!targetData) {
      console.warn(`⚠️ No data found for ${node.source}.${node.field} at ${targetPeriod}`);
      if (targetPeriod !== asOfPeriod) {
        console.warn(`   Original period: ${asOfPeriod}, Target period after offset: ${targetPeriod}`);
      }
      console.warn(`   Available periods in ${node.source}: ${relevantRows.map(r => `${r.fiscalyear}-${r.period}`).join(', ')}`);
      console.warn(`   Looking for exact match of: source_table='${node.source}' AND period='${targetPeriod}'`);
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
  private calculateRollingField(node: any, rawData: RawDataRow[], asOfPeriod: string): number | null {
    if (!node.selector || !node.selector.rolling) {
      return null;
    }

    const periods = node.selector.rolling.window_size || 4;
    const operation = node.selector.rolling.aggregation || 'sum';

    console.log(`🔄 Rolling calculation: ${periods} periods, operation: ${operation}`);
    
    // 解析目标期间
    const [targetYear, targetPeriod] = asOfPeriod.split('-');
    const targetYearNum = parseInt(targetYear);
    
    // 获取相关数据并按时间排序
    const relevantData = rawData
      .filter(row => row.source_table === node.source)
      .sort((a, b) => {
        if (a.fiscalyear !== b.fiscalyear) return b.fiscalyear - a.fiscalyear;
        return this.getPeriodOrder(b.period) - this.getPeriodOrder(a.period);
      });

    // 找到目标期间的索引
    const targetIndex = relevantData.findIndex(row => 
      row.fiscalyear === targetYearNum && row.period === targetPeriod
    );

    if (targetIndex === -1) {
      console.warn(`⚠️ Target period ${asOfPeriod} not found for rolling calculation`);
      return null;
    }

    // 获取rolling periods的数据
    const rollingData = relevantData.slice(targetIndex, targetIndex + periods);
    
    if (rollingData.length < periods) {
      console.warn(`⚠️ Not enough data for ${periods}-period rolling calculation. Only ${rollingData.length} periods available.`);
    }

    // 提取值并计算
    const fieldKey = node.field.toLowerCase();
    const values = rollingData
      .map(row => row[fieldKey])
      .filter(val => val !== null && !isNaN(parseFloat(val)))
      .map(val => parseFloat(val));

    if (values.length === 0) return null;

    console.log(`🔄 Rolling ${operation} for ${periods} periods:`, values);

    switch (operation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'average':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'latest':
        return values[0]; // First in sorted array is latest
      case 'change':
        return values.length >= 2 ? values[0] - values[values.length - 1] : null;
      default:
        console.warn(`⚠️ Unknown rolling operation: ${operation}`);
        return null;
    }
  }

  /**
   * 评估rolling节点
   */
  private evaluateRolling(node: RollingNode, rawData: RawDataRow[], asOfPeriod: string): number | null {
    // Rolling nodes need to evaluate across multiple periods
    // This is more complex and would need period iteration logic
    console.warn('⚠️ Rolling node evaluation not yet implemented');
    return null;
  }

  /**
   * 评估聚合节点
   * 对多个值进行聚合计算（求和、平均、最大/最小值）
   */
  private evaluateAggregation(node: AggregationNode, rawData: RawDataRow[], asOfPeriod: string): number | null {
    console.log(`🔄 Evaluating aggregation node: ${node.function} over ${node.values.length} values`);
    
    // 评估所有子节点获取值数组
    const evaluatedValues: number[] = [];
    
    for (const valueNode of node.values) {
      const result = this.evaluateAST(valueNode, rawData, asOfPeriod);
      if (result === null) {
        console.warn(`⚠️ Aggregation: one of the values evaluated to null, skipping`);
        continue; // 跳过null值，继续处理其他值
      }
      evaluatedValues.push(result);
    }
    
    if (evaluatedValues.length === 0) {
      console.warn(`⚠️ Aggregation: no valid values found`);
      return null;
    }
    
    console.log(`📊 Aggregation input values:`, evaluatedValues);
    
    // 根据聚合函数类型执行计算
    let result: number;
    
    switch (node.function) {
      case 'sum':
      case 'ttm': // TTM is essentially a sum over trailing 12 months
        result = evaluatedValues.reduce((acc, val) => acc + val, 0);
        break;
        
      case 'average':
        result = evaluatedValues.reduce((acc, val) => acc + val, 0) / evaluatedValues.length;
        break;
        
      case 'max':
        result = Math.max(...evaluatedValues);
        break;
        
      case 'min':
        result = Math.min(...evaluatedValues);
        break;
        
      default:
        console.warn(`⚠️ Unknown aggregation function: ${node.function}`);
        return null;
    }
    
    console.log(`✅ Aggregation result: ${node.function}(${evaluatedValues.join(', ')}) = ${result}`);
    return result;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: any, rawData: RawDataRow[], asOfPeriod: string): boolean {
    const left = this.evaluateAST(condition.left, rawData, asOfPeriod);
    const right = this.evaluateAST(condition.right, rawData, asOfPeriod);
    
    if (left === null || right === null) return false;
    
    switch (condition.operator) {
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '==': return left === right;
      case '!=': return left !== right;
      default: return false;
    }
  }

  /**
   * 获取期间的排序顺序
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
   * 计算偏移后的期间
   * @param basePeriod 基准期间 (如 "2025-Q2")
   * @param offset 偏移量 (如 -4 表示4个季度前)
   * @returns 偏移后的期间
   */
  private calculateOffsetPeriod(basePeriod: string, offset: number): string {
    const [yearStr, period] = basePeriod.split('-');
    let year = parseInt(yearStr);
    
    if (period === 'FY') {
      // 年度数据，offset直接加到年份上
      return `${year + offset}-FY`;
    } else {
      // 季度数据
      const quarterMatch = period.match(/Q(\d)/);
      if (!quarterMatch) {
        console.warn(`⚠️ Invalid period format: ${period}`);
        return basePeriod;
      }
      
      let quarter = parseInt(quarterMatch[1]);
      
      // 计算新的季度和年份
      // offset为负数时往前回退，正数时往前推进
      let totalQuarters = (year - 1) * 4 + quarter + offset;
      
      if (totalQuarters <= 0) {
        console.warn(`⚠️ Calculated period is too early: ${basePeriod} + ${offset}`);
        return basePeriod; // 返回原值，避免计算错误
      }
      
      const newYear = Math.floor((totalQuarters - 1) / 4) + 1;
      const newQuarter = ((totalQuarters - 1) % 4) + 1;
      
      return `${newYear}-Q${newQuarter}`;
    }
  }
}