/**
 * MotherDuck HTTP REST API Client for Serverless Environments
 * 使用HTTP API而不是原生二进制文件，完全支持Vercel等云环境
 */
class MotherDuckClient {
  private token: string;
  private apiBaseUrl: string = 'https://api.motherduck.com';
  
  constructor() {
    const motherduckToken = process.env.MOTHERDUCK_TOKEN;
    if (!motherduckToken) {
      throw new Error('MOTHERDUCK_TOKEN environment variable is required');
    }
    this.token = motherduckToken;
  }
  
  async query(sql: string): Promise<any[]> {
    try {
      console.log('🦆 Executing SQL via MotherDuck HTTP API:', sql);
      
      const response = await fetch(`${this.apiBaseUrl}/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database: 'financial_db',
          query: sql,
          output_format: 'json'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MotherDuck API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ MotherDuck HTTP API query completed: ${result.data?.length || 0} rows`);
      
      return result.data || [];
      
    } catch (error) {
      console.error('❌ MotherDuck HTTP API error:', error);
      
      // 如果HTTP API不可用，提供有用的错误信息
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(`MotherDuck HTTP API connection failed. Please check your internet connection and MotherDuck service status. Original error: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  async close(): Promise<void> {
    // HTTP连接无需显式关闭
    console.log('🦆 MotherDuck HTTP client closed');
  }
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
 * 简化版本的财务计算引擎 - 现在使用DuckDB MotherDuck
 */
export class SimplifiedFinancialEngine {
  private client: MotherDuckClient;

  constructor() {
    this.client = new MotherDuckClient();
  }

  /**
   * 计算多个symbols的指标
   */
  async calculateMetric(request: CalculationRequest): Promise<any> {
    const startTime = performance.now();
    const { metricDefinition, symbols, periods = 4, periodType = 'quarter', asOf } = request;

    console.log(`🚀 DuckDB-optimized calculation for ${symbols.length} symbols`);
    console.log(`📊 Metric: ${metricDefinition.name}`);
    console.log(`📅 Periods: ${periods} ${periodType}s`);

    try {
      // 1. 直接生成包含AST计算的优化SQL
      const sql = this.generateOptimizedSQL(metricDefinition.ast, symbols, periods, periodType, asOf);
      console.log('🔍 Generated SQL:', sql);

      // 2. 一次性在DuckDB中完成所有计算
      const rawResults = await this.client.query(sql);
      console.log(`📊 DuckDB returned ${rawResults.length} calculated rows`);

      // 3. 按symbol分组结果
      const groupedResults = this.groupResultsBySymbol(rawResults);

      const endTime = performance.now();
      const executionTimeMs = Math.round(endTime - startTime);

      console.log(`⚡ DuckDB calculation completed in ${executionTimeMs}ms`);

      return {
        metric: metricDefinition.name,
        symbols: symbols.map(symbol => ({
          symbol,
          values: groupedResults[symbol] || []
        })),
        metadata: {
          periods,
          periodType,
          asOf,
          executionTimeMs,
          executionTimeFormatted: `${executionTimeMs}ms`,
          calculatedAt: new Date().toISOString(),
          rowsProcessed: rawResults.length
        }
      };

    } catch (error) {
      console.error('❌ DuckDB calculation error:', error);
      throw error;
    }
  }

  /**
   * 生成优化的DuckDB SQL - 核心重构方法
   */
  private generateOptimizedSQL(
    ast: ASTNode, 
    symbols: string[], 
    periods: number, 
    periodType: 'quarter' | 'annual', 
    asOf?: string
  ): string {
    // 1. 从AST提取需要的表和字段
    const requirements = this.extractDataRequirements(ast);
    const tables = Array.from(requirements.tables);
    
    // 2. 转换AST为SQL表达式
    const metricExpression = this.astToSQL(ast);
    
    // 3. 构建符号过滤条件
    const symbolList = symbols.map(s => `'${s}'`).join(',');
    
    // 4. 构建时间过滤条件
    let timeFilter = '';
    if (periodType === 'annual') {
      timeFilter = `AND period = 'FY'`;
    } else {
      timeFilter = `AND period IN ('Q1', 'Q2', 'Q3', 'Q4')`;
    }
    
    if (asOf) {
      const [year, period] = asOf.split('-');
      if (periodType === 'annual') {
        timeFilter += ` AND fiscalyear <= ${year}`;
      } else {
        // 简化的季度过滤逻辑
        timeFilter += ` AND fiscalyear <= ${year}`;
      }
    }
    
    // 5. 检查是否包含聚合函数，决定查询结构
    const hasAggregates = this.containsAggregateFunction(ast);
    
    if (hasAggregates) {
      // 包含聚合函数 - 需要GROUP BY，用HAVING过滤
      if (tables.length === 1) {
        const table = tables[0];
        return `
          SELECT 
            symbol,
            fiscalyear,
            period,
            ${metricExpression} as metric_value
          FROM ${table}
          WHERE symbol IN (${symbolList})
            ${timeFilter}
          GROUP BY symbol, fiscalyear, period
          HAVING ${metricExpression} IS NOT NULL
          ORDER BY symbol, fiscalyear DESC, period DESC
          LIMIT ${periods * symbols.length}
        `;
      } else {
        const baseTable = tables[0];
        const joins = tables.slice(1).map(table => 
          `LEFT JOIN ${table} USING (symbol, fiscalyear, period)`
        ).join('\n          ');
        
        return `
          SELECT 
            ${baseTable}.symbol,
            ${baseTable}.fiscalyear,
            ${baseTable}.period,
            ${metricExpression} as metric_value
          FROM ${baseTable}
          ${joins}
          WHERE ${baseTable}.symbol IN (${symbolList})
            ${timeFilter}
          GROUP BY ${baseTable}.symbol, ${baseTable}.fiscalyear, ${baseTable}.period
          HAVING ${metricExpression} IS NOT NULL
          ORDER BY ${baseTable}.symbol, ${baseTable}.fiscalyear DESC, ${baseTable}.period DESC
          LIMIT ${periods * symbols.length}
        `;
      }
    } else {
      // 不包含聚合函数 - 可以在WHERE中直接过滤
      if (tables.length === 1) {
        const table = tables[0];
        return `
          SELECT 
            symbol,
            fiscalyear,
            period,
            ${metricExpression} as metric_value
          FROM ${table}
          WHERE symbol IN (${symbolList})
            ${timeFilter}
            AND ${metricExpression} IS NOT NULL
          ORDER BY symbol, fiscalyear DESC, period DESC
          LIMIT ${periods * symbols.length}
        `;
      } else {
        const baseTable = tables[0];
        const joins = tables.slice(1).map(table => 
          `LEFT JOIN ${table} USING (symbol, fiscalyear, period)`
        ).join('\n          ');
        
        return `
          SELECT 
            ${baseTable}.symbol,
            ${baseTable}.fiscalyear,
            ${baseTable}.period,
            ${metricExpression} as metric_value
          FROM ${baseTable}
          ${joins}
          WHERE ${baseTable}.symbol IN (${symbolList})
            ${timeFilter}
            AND ${metricExpression} IS NOT NULL
          ORDER BY ${baseTable}.symbol, ${baseTable}.fiscalyear DESC, ${baseTable}.period DESC
          LIMIT ${periods * symbols.length}
        `;
      }
    }
  }

  /**
   * AST节点转SQL表达式
   */
  private astToSQL(node: ASTNode): string {
    switch (node.type) {
      case 'field':
        return `${node.source}.${node.field}`;
      
      case 'arithmetic':
        const left = this.astToSQL(node.left);
        const right = this.astToSQL(node.right);
        const op = node.operator;
        
        // 防除零处理
        if (op === 'divide') {
          return `(${left} / NULLIF(${right}, 0))`;
        }
        
        return `(${left} ${this.getOperatorSymbol(op)} ${right})`;
      
      case 'constant':
        return node.value.toString();
      
      case 'aggregation':
        const values = node.values?.map(v => this.astToSQL(v)).join(', ') || '';
        const functionName = this.normalizeAggregateFunction(node.function);
        return `${functionName}(${values})`;
      
      case 'rolling':
        // 简化处理，实际可能需要窗口函数
        return this.astToSQL(node.operand);
      
      case 'conditional':
        const condition = `${this.astToSQL(node.condition.left)} ${node.condition.operator} ${this.astToSQL(node.condition.right)}`;
        const thenExpr = this.astToSQL(node.then);
        const elseExpr = node.else ? this.astToSQL(node.else) : 'NULL';
        return `CASE WHEN ${condition} THEN ${thenExpr} ELSE ${elseExpr} END`;
      
      default:
        throw new Error(`Unsupported AST node type: ${(node as any).type}`);
    }
  }

  /**
   * 运算符映射
   */
  private getOperatorSymbol(op: string): string {
    const operators: { [key: string]: string } = {
      'add': '+',
      'subtract': '-',
      'multiply': '*',
      'divide': '/',
      'modulo': '%'
    };
    return operators[op] || op;
  }

  /**
   * 标准化聚合函数名称 - 修正 average -> AVG
   */
  private normalizeAggregateFunction(functionName: string): string {
    const normalizedFunctions: { [key: string]: string } = {
      'average': 'AVG',
      'avg': 'AVG',
      'sum': 'SUM',
      'count': 'COUNT',
      'min': 'MIN',
      'max': 'MAX',
      'median': 'MEDIAN',
      'stddev': 'STDDEV',
      'variance': 'VAR_SAMP'
    };
    
    const normalized = normalizedFunctions[functionName.toLowerCase()];
    if (normalized) {
      return normalized;
    }
    
    // 如果没有映射，就转换为大写
    return functionName.toUpperCase();
  }

  /**
   * 检查AST表达式是否包含聚合函数
   */
  private containsAggregateFunction(node: ASTNode): boolean {
    switch (node.type) {
      case 'aggregation':
        return true;
      case 'arithmetic':
        return this.containsAggregateFunction(node.left) || this.containsAggregateFunction(node.right);
      case 'conditional':
        return this.containsAggregateFunction(node.condition.left) || 
               this.containsAggregateFunction(node.condition.right) ||
               this.containsAggregateFunction(node.then) ||
               (node.else ? this.containsAggregateFunction(node.else) : false);
      case 'rolling':
        return this.containsAggregateFunction(node.operand);
      case 'field':
      case 'constant':
        return false;
      default:
        return false;
    }
  }

  /**
   * 按symbol分组结果
   */
  private groupResultsBySymbol(results: any[]): { [symbol: string]: any[] } {
    const grouped: { [symbol: string]: any[] } = {};
    
    for (const row of results) {
      if (!grouped[row.symbol]) {
        grouped[row.symbol] = [];
      }
      grouped[row.symbol].push({
        period: `${row.fiscalyear}-${row.period}`,
        value: row.metric_value,
        fiscalyear: row.fiscalyear,
        quarter: row.period
      });
    }
    
    return grouped;
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
        const result = await this.client.query(query);
        console.log(`📊 Table '${table}' returned ${result.length} rows`);
        allResults.push(...result);
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
  
  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}