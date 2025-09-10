/**
 * SQL Template Library for Financial Metrics
 * 减少LLM SQL生成的不稳定性
 */

export interface SQLTemplate {
  name: string;
  description: string;
  template: string;
  requiredParams: string[];
  exampleParams: Record<string, any>;
}

export const SQL_TEMPLATES: Record<string, SQLTemplate> = {
  // 单公司时间序列
  'single_company_timeseries': {
    name: 'Single Company Time Series',
    description: 'Get metric values for one company over multiple periods',
    template: `
      SELECT 
        symbol,
        period,
        {{metric_calculation}} as {{metric_name}},
        market_cap,
        sector
      FROM financial_data 
      WHERE symbol = '{{company}}'
        AND period BETWEEN '{{start_period}}' AND '{{end_period}}'
        {{additional_filters}}
      ORDER BY period ASC
    `,
    requiredParams: ['company', 'metric_calculation', 'metric_name', 'start_period', 'end_period'],
    exampleParams: {
      company: 'AAPL',
      metric_calculation: 'net_income / shareholder_equity',
      metric_name: 'roe',
      start_period: '2023Q1',
      end_period: '2024Q4',
      additional_filters: ''
    }
  },

  // 多公司比较
  'multi_company_comparison': {
    name: 'Multi Company Comparison',
    description: 'Compare metric values across multiple companies for same period',
    template: `
      SELECT 
        symbol,
        company_name,
        '{{period}}' as period,
        {{metric_calculation}} as {{metric_name}},
        market_cap,
        sector,
        ROW_NUMBER() OVER (ORDER BY {{metric_calculation}} DESC) as rank
      FROM financial_data 
      WHERE symbol IN ({{company_list}})
        AND period = '{{period}}'
        {{additional_filters}}
      ORDER BY {{metric_calculation}} DESC
      {{limit_clause}}
    `,
    requiredParams: ['company_list', 'period', 'metric_calculation', 'metric_name'],
    exampleParams: {
      company_list: "'AAPL', 'MSFT', 'GOOGL'",
      period: '2024Q4',
      metric_calculation: 'ebit / ((total_assets + LAG(total_assets) OVER (PARTITION BY symbol ORDER BY period)) / 2)',
      metric_name: 'roce',
      additional_filters: 'AND market_cap > 10000000000',
      limit_clause: 'LIMIT 20'
    }
  },

  // 行业排名
  'industry_ranking': {
    name: 'Industry Ranking',
    description: 'Rank companies within industry or globally',
    template: `
      SELECT 
        symbol,
        company_name,
        period,
        {{metric_calculation}} as {{metric_name}},
        market_cap,
        sector,
        ROW_NUMBER() OVER ({{partition_clause}} ORDER BY {{metric_calculation}} DESC) as rank
      FROM financial_data 
      WHERE period = '{{period}}'
        {{additional_filters}}
        AND {{metric_calculation}} IS NOT NULL
      ORDER BY {{metric_calculation}} DESC
      {{limit_clause}}
    `,
    requiredParams: ['period', 'metric_calculation', 'metric_name'],
    exampleParams: {
      period: '2024Q4',
      metric_calculation: 'net_income / shareholder_equity',
      metric_name: 'roe',
      partition_clause: 'PARTITION BY sector',
      additional_filters: 'AND market_cap > 1000000000',
      limit_clause: 'LIMIT 50'
    }
  },

  // 趋势分析
  'trend_analysis': {
    name: 'Trend Analysis',
    description: 'Analyze metric trends over time with growth calculations',
    template: `
      WITH metric_data AS (
        SELECT 
          symbol,
          period,
          {{metric_calculation}} as {{metric_name}},
          LAG({{metric_calculation}}) OVER (PARTITION BY symbol ORDER BY period) as prev_{{metric_name}}
        FROM financial_data 
        WHERE symbol IN ({{company_list}})
          AND period BETWEEN '{{start_period}}' AND '{{end_period}}'
          {{additional_filters}}
      )
      SELECT 
        symbol,
        period,
        {{metric_name}},
        prev_{{metric_name}},
        CASE 
          WHEN prev_{{metric_name}} IS NOT NULL AND prev_{{metric_name}} != 0
          THEN ({{metric_name}} - prev_{{metric_name}}) / prev_{{metric_name}} * 100
          ELSE NULL 
        END as growth_rate_pct
      FROM metric_data
      ORDER BY symbol, period
    `,
    requiredParams: ['company_list', 'metric_calculation', 'metric_name', 'start_period', 'end_period'],
    exampleParams: {
      company_list: "'AAPL', 'MSFT'",
      metric_calculation: 'net_income / shareholder_equity',
      metric_name: 'roe',
      start_period: '2023Q1',
      end_period: '2024Q4',
      additional_filters: ''
    }
  }
};

/**
 * SQL模板引擎
 */
export class SQLTemplateEngine {
  /**
   * 根据查询类型选择最适合的模板
   */
  static selectTemplate(queryType: string, requirements: any): SQLTemplate | null {
    // 简单的模板选择逻辑
    if (requirements.companies?.length === 1 && requirements.timeRange?.includes('-')) {
      return SQL_TEMPLATES.single_company_timeseries;
    }
    
    if (requirements.companies?.length > 1 && !requirements.timeRange?.includes('-')) {
      return SQL_TEMPLATES.multi_company_comparison;
    }
    
    if (requirements.filterCriteria?.includes('rank') || requirements.sortAndLimit?.includes('top')) {
      return SQL_TEMPLATES.industry_ranking;
    }
    
    if (requirements.description?.includes('trend') || requirements.description?.includes('growth')) {
      return SQL_TEMPLATES.trend_analysis;
    }
    
    return SQL_TEMPLATES.multi_company_comparison; // 默认
  }
  
  /**
   * 填充模板参数
   */
  static fillTemplate(template: SQLTemplate, params: Record<string, any>): string {
    let sql = template.template;
    
    // 替换所有 {{param}} 占位符
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      sql = sql.replace(placeholder, value || '');
    });
    
    // 清理空的可选部分
    sql = sql.replace(/\{\{[^}]+\}\}/g, ''); // 移除未填充的占位符
    sql = sql.replace(/\s+/g, ' ').trim(); // 清理多余空格
    
    return sql;
  }
  
  /**
   * 验证必需参数
   */
  static validateParams(template: SQLTemplate, params: Record<string, any>): string[] {
    const missing = template.requiredParams.filter(param => !params[param]);
    return missing;
  }
}