/**
 * Enhanced SQL Generation Prompts
 * 提高LLM SQL生成的稳定性和准确性
 */

export interface DatabaseSchema {
  tables: {
    [tableName: string]: {
      columns: string[];
      description: string;
      sampleData?: Record<string, any>;
    }
  };
}

// 标准财务数据库schema
export const FINANCIAL_DB_SCHEMA: DatabaseSchema = {
  tables: {
    financial_data: {
      columns: [
        'symbol', 'company_name', 'period', 'fiscal_year', 'fiscal_quarter',
        'revenue', 'net_income', 'total_assets', 'shareholder_equity', 'total_debt',
        'operating_cash_flow', 'free_cash_flow', 'ebit', 'ebitda',
        'market_cap', 'sector', 'industry', 'country'
      ],
      description: 'Comprehensive financial data for public companies',
      sampleData: {
        symbol: 'AAPL',
        company_name: 'Apple Inc.',
        period: '2024Q4',
        fiscal_year: 2024,
        fiscal_quarter: 4,
        revenue: 94930000000,
        net_income: 23636000000,
        total_assets: 353514000000,
        shareholder_equity: 74100000000,
        market_cap: 3500000000000,
        sector: 'Technology'
      }
    }
  }
};

/**
 * SQL提示增强器
 */
export class SQLPromptEnhancer {
  /**
   * 生成强化的SQL生成提示
   */
  static generateEnhancedPrompt(
    latexFormula: string,
    queryRequirements: any,
    schema: DatabaseSchema = FINANCIAL_DB_SCHEMA
  ): string {
    return `
# CRITICAL SQL GENERATION INSTRUCTIONS

You are a financial SQL expert. Generate EXACTLY ONE valid DuckDB SQL query.

## MANDATORY REQUIREMENTS:
1. **OUTPUT FORMAT**: Return ONLY the SQL query, no explanations
2. **SYNTAX**: Use DuckDB-compatible SQL syntax only
3. **FIELD NAMES**: Use exact column names from schema below
4. **NO COMMENTS**: Do not include SQL comments
5. **VALIDATION**: Query must be syntactically correct and executable

## DATABASE SCHEMA:
\`\`\`
${this.formatSchema(schema)}
\`\`\`

## LATEX FORMULA TO IMPLEMENT:
\`\`\`
${latexFormula}
\`\`\`

## QUERY REQUIREMENTS:
- **Analysis**: ${queryRequirements.description}
- **Companies**: ${queryRequirements.companies}
- **Time Range**: ${queryRequirements.timeRange}
- **Filters**: ${queryRequirements.filterCriteria}
- **Sort/Limit**: ${queryRequirements.sortAndLimit}
- **Expected Fields**: ${queryRequirements.sqlFields}

## SQL GENERATION RULES:
1. **Column Mapping**:
   - Revenue → revenue
   - Net Income → net_income  
   - Assets → total_assets
   - Equity → shareholder_equity
   - EBIT → ebit

2. **Period Format**: 
   - Use format: '2024Q1', '2024Q2', etc.
   - For ranges: period BETWEEN '2023Q1' AND '2024Q4'

3. **Common Calculations**:
   - ROE: net_income / shareholder_equity
   - ROCE: ebit / ((total_assets + LAG(total_assets) OVER (PARTITION BY symbol ORDER BY period)) / 2)
   - Debt Ratio: total_debt / total_assets

4. **Required SELECT Fields**:
   Always include: symbol, period, calculated_metric_value
   
5. **Error Prevention**:
   - Check for NULL values: WHERE calculated_value IS NOT NULL
   - Use COALESCE for safety: COALESCE(net_income, 0)
   - Proper window functions: PARTITION BY symbol ORDER BY period

## EXAMPLE OUTPUT FORMAT:
\`\`\`sql
SELECT 
  symbol,
  period,
  net_income / shareholder_equity as roe,
  market_cap
FROM financial_data 
WHERE symbol IN ('AAPL', 'MSFT')
  AND period BETWEEN '2023Q1' AND '2024Q4'
  AND net_income IS NOT NULL 
  AND shareholder_equity > 0
ORDER BY period ASC
\`\`\`

GENERATE SQL NOW:
`;
  }

  /**
   * 格式化数据库schema为提示文本
   */
  private static formatSchema(schema: DatabaseSchema): string {
    return Object.entries(schema.tables)
      .map(([tableName, tableInfo]) => {
        const columns = tableInfo.columns.join(', ');
        const sample = tableInfo.sampleData 
          ? `\nSample: ${JSON.stringify(tableInfo.sampleData, null, 2)}`
          : '';
        
        return `Table: ${tableName}
Description: ${tableInfo.description}
Columns: ${columns}${sample}`;
      })
      .join('\n\n');
  }

  /**
   * 生成SQL验证提示
   */
  static generateValidationPrompt(sql: string): string {
    return `
# SQL VALIDATION TASK

Validate this DuckDB SQL query for financial data analysis:

\`\`\`sql
${sql}
\`\`\`

Check for:
1. **Syntax Errors**: DuckDB compatibility
2. **Logic Errors**: Mathematical calculations
3. **Performance Issues**: Missing indexes, inefficient joins
4. **Data Issues**: NULL handling, division by zero

Respond with:
- "VALID" if query is correct
- "INVALID: [specific error]" if issues found
- "OPTIMIZED: [improved version]" if can be improved

Response:
`;
  }
}

/**
 * SQL后处理器
 */
export class SQLPostProcessor {
  /**
   * 清理LLM生成的SQL
   */
  static cleanSQL(rawSQL: string): string {
    // 移除代码块标记
    let sql = rawSQL.replace(/```sql\n?/g, '').replace(/```\n?/g, '');
    
    // 移除注释
    sql = sql.replace(/--.*$/gm, '');
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 清理空行和多余空格
    sql = sql.replace(/\n\s*\n/g, '\n');
    sql = sql.replace(/\s+/g, ' ').trim();
    
    // 确保分号结尾
    if (!sql.endsWith(';')) {
      sql += ';';
    }
    
    return sql;
  }

  /**
   * 验证SQL基本语法
   */
  static validateBasicSyntax(sql: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 基本语法检查
    if (!sql.toLowerCase().includes('select')) {
      errors.push('Missing SELECT statement');
    }
    
    if (!sql.toLowerCase().includes('from')) {
      errors.push('Missing FROM clause');
    }
    
    // 括号配对检查
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unmatched parentheses');
    }
    
    // 引号配对检查
    const singleQuotes = (sql.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push('Unmatched single quotes');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}