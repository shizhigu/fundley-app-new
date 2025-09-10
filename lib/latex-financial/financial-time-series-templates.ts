/**
 * Financial Time Series SQL Templates
 * 专门解决财务数据时间序列处理的复杂性
 */

export interface FinancialTimeSeriesTemplate {
  name: string;
  description: string;
  useCases: string[];
  template: string;
  requiredParams: string[];
  timeSeriesType: 'quarterly' | 'annual' | 'mixed';
  exampleUsage: string;
}

/**
 * 财务时间序列SQL模板库
 */
export const FINANCIAL_TIME_SERIES_TEMPLATES: Record<string, FinancialTimeSeriesTemplate> = {
  
  /**
   * 季度时间序列模板 - 正确处理Q1-Q4跨年度排序
   */
  quarterly_time_series: {
    name: 'Quarterly Time Series with Proper Ordering',
    description: 'Handle quarterly data with correct time sequence (Q4-2023 → Q1-2024)',
    useCases: ['ROCE calculation', 'Quarter-over-quarter growth', 'Seasonal analysis'],
    timeSeriesType: 'quarterly',
    template: `
WITH quarterly_ranked AS (
    SELECT 
        i.symbol,
        i.fiscalyear,
        i.period,
        i.date,
        {{income_fields}},
        {{balance_fields}},
        ROW_NUMBER() OVER (
            PARTITION BY i.symbol 
            ORDER BY i.fiscalyear DESC, 
                     CASE i.period 
                       WHEN 'Q4' THEN 1 
                       WHEN 'Q3' THEN 2 
                       WHEN 'Q2' THEN 3 
                       WHEN 'Q1' THEN 4 
                     END
        ) - 1 as relative_quarter
    FROM income_statement i
    {{join_clause}}
    WHERE i.period IN ('Q1', 'Q2', 'Q3', 'Q4')  -- Exclude FY data
        AND {{data_quality_filters}}
),
metric_calculation AS (
    SELECT 
        current_q.*,
        {{lag_join_fields}},
        {{metric_formula}} as {{metric_name}}
    FROM quarterly_ranked current_q
    LEFT JOIN quarterly_ranked prev_q ON (
        current_q.symbol = prev_q.symbol 
        AND current_q.relative_quarter = prev_q.relative_quarter - 1
    )
)
SELECT 
    symbol,
    relative_quarter,
    {{metric_name}},
    fiscalyear,
    period,
    date
FROM metric_calculation
WHERE {{metric_name}} IS NOT NULL
    {{additional_filters}}
ORDER BY symbol, relative_quarter
{{limit_clause}}`,
    requiredParams: [
      'income_fields', 'balance_fields', 'join_clause', 'data_quality_filters',
      'lag_join_fields', 'metric_formula', 'metric_name'
    ],
    exampleUsage: 'NVDA ROCE for past 20 quarters'
  },

  /**
   * 年度时间序列模板
   */
  annual_time_series: {
    name: 'Annual Time Series',
    description: 'Handle annual financial data with year-over-year comparisons',
    useCases: ['Annual ROE trends', 'Long-term growth analysis', 'Peer comparison'],
    timeSeriesType: 'annual',
    template: `
WITH annual_data AS (
    SELECT 
        i.symbol,
        i.fiscalyear,
        {{income_fields}},
        {{balance_fields}},
        ROW_NUMBER() OVER (
            PARTITION BY i.symbol 
            ORDER BY i.fiscalyear DESC
        ) - 1 as relative_year
    FROM income_statement i
    {{join_clause}}
    WHERE i.period = 'FY'  -- Annual data only
        AND {{data_quality_filters}}
),
metric_calculation AS (
    SELECT 
        current_y.*,
        {{lag_join_fields}},
        {{metric_formula}} as {{metric_name}}
    FROM annual_data current_y
    LEFT JOIN annual_data prev_y ON (
        current_y.symbol = prev_y.symbol 
        AND current_y.relative_year = prev_y.relative_year - 1
    )
)
SELECT 
    symbol,
    relative_year,
    {{metric_name}},
    fiscalyear
FROM metric_calculation
WHERE {{metric_name}} IS NOT NULL
    {{additional_filters}}
ORDER BY symbol, relative_year
{{limit_clause}}`,
    requiredParams: [
      'income_fields', 'balance_fields', 'join_clause', 'data_quality_filters',
      'lag_join_fields', 'metric_formula', 'metric_name'
    ],
    exampleUsage: 'Annual ROE comparison across multiple years'
  },

  /**
   * 多公司排名模板
   */
  multi_company_ranking: {
    name: 'Multi-Company Ranking',
    description: 'Rank companies by financial metrics for specific periods',
    useCases: ['Industry ROCE ranking', 'Best performers identification', 'Peer analysis'],
    timeSeriesType: 'mixed',
    template: `
WITH latest_period_data AS (
    SELECT 
        i.symbol,
        i.company_name,
        i.fiscalyear,
        i.period,
        {{income_fields}},
        {{balance_fields}}
    FROM income_statement i
    {{join_clause}}
    WHERE {{period_filter}}
        AND {{company_filter}}
        AND {{data_quality_filters}}
),
metric_calculation AS (
    SELECT *,
        {{metric_formula}} as {{metric_name}}
    FROM latest_period_data
    WHERE {{metric_validation}}
),
ranking AS (
    SELECT *,
        ROW_NUMBER() OVER (ORDER BY {{metric_name}} DESC) as rank,
        PERCENT_RANK() OVER (ORDER BY {{metric_name}}) as percentile
    FROM metric_calculation
)
SELECT 
    symbol,
    company_name,
    fiscalyear,
    period,
    {{metric_name}},
    rank,
    ROUND(percentile * 100, 1) as percentile_rank
FROM ranking
{{final_filters}}
ORDER BY {{metric_name}} DESC
{{limit_clause}}`,
    requiredParams: [
      'income_fields', 'balance_fields', 'join_clause', 'period_filter',
      'company_filter', 'data_quality_filters', 'metric_formula', 'metric_name'
    ],
    exampleUsage: 'Top 20 companies by ROCE in latest quarter'
  }
};

/**
 * ROCE专用模板参数生成器
 */
export class ROCETemplateGenerator {
  /**
   * 生成ROCE计算所需的模板参数
   */
  static generateROCEParams(companies: string[], timeRange: string, limitCount: number = 20): Record<string, string> {
    return {
      // 字段定义
      income_fields: 'i.ebit',
      balance_fields: 'b.totalassets, b.totalcurrentliabilities',
      
      // JOIN子句
      join_clause: `JOIN balance_sheet b ON (
        i.symbol = b.symbol 
        AND i.fiscalyear = b.fiscalyear 
        AND i.period = b.period
      )`,
      
      // 数据质量过滤
      data_quality_filters: `i.ebit IS NOT NULL
        AND b.totalassets IS NOT NULL
        AND b.totalcurrentliabilities IS NOT NULL
        ${companies.length > 0 ? `AND i.symbol IN (${companies.map(c => `'${c}'`).join(', ')})` : ''}`,
      
      // 前期数据字段
      lag_join_fields: `prev_q.totalassets as prev_year_totalassets,
        prev_q.totalcurrentliabilities as prev_year_totalcurrentliabilities`,
      
      // ROCE公式 - 严格按照你的正确版本
      metric_formula: `CASE 
        WHEN prev_q.totalassets IS NOT NULL 
            AND prev_q.totalcurrentliabilities IS NOT NULL 
            AND ((current_q.totalassets + prev_q.totalassets) / 2.0 - 
                 (current_q.totalcurrentliabilities + prev_q.totalcurrentliabilities) / 2.0) != 0
        THEN 
            ROUND(
                (current_q.ebit::NUMERIC / 
                 ((current_q.totalassets + prev_q.totalassets) / 2.0 - 
                  (current_q.totalcurrentliabilities + prev_q.totalcurrentliabilities) / 2.0)
                ) * 100, 2
            )
        ELSE NULL 
      END`,
      
      metric_name: 'roce_pct',
      additional_filters: '',
      limit_clause: limitCount > 0 ? `LIMIT ${limitCount}` : ''
    };
  }
}

/**
 * 智能模板选择器
 */
export class FinancialTemplateSelector {
  /**
   * 根据查询需求自动选择最合适的模板
   */
  static selectTemplate(requirements: {
    description: string;
    companies: string;
    timeRange: string;
    expectedDataVolume: string;
  }): { template: FinancialTimeSeriesTemplate; params: Record<string, string> } {
    
    const { description, companies, timeRange, expectedDataVolume } = requirements;
    
    // 解析公司列表
    const companyList = this.parseCompanies(companies);
    
    // 解析期间数量
    const periodCount = this.extractPeriodCount(expectedDataVolume);
    
    // 选择模板
    let selectedTemplate: FinancialTimeSeriesTemplate;
    
    if (description.includes('quarter') || timeRange.includes('quarter') || timeRange.includes('Q')) {
      selectedTemplate = FINANCIAL_TIME_SERIES_TEMPLATES.quarterly_time_series;
    } else if (description.includes('annual') || timeRange.includes('year') || timeRange.includes('FY')) {
      selectedTemplate = FINANCIAL_TIME_SERIES_TEMPLATES.annual_time_series;
    } else if (companyList.length > 1 && !timeRange.includes('-')) {
      selectedTemplate = FINANCIAL_TIME_SERIES_TEMPLATES.multi_company_ranking;
    } else {
      // 默认使用季度模板
      selectedTemplate = FINANCIAL_TIME_SERIES_TEMPLATES.quarterly_time_series;
    }
    
    // 生成参数
    let params: Record<string, string>;
    
    if (description.includes('ROCE') || description.includes('roce')) {
      params = ROCETemplateGenerator.generateROCEParams(companyList, timeRange, periodCount);
    } else {
      // 其他指标的通用参数生成
      params = this.generateGenericParams(companyList, timeRange, periodCount);
    }
    
    return { template: selectedTemplate, params };
  }
  
  private static parseCompanies(companiesStr: string): string[] {
    if (companiesStr.includes('No company restrictions') || companiesStr.includes('All')) {
      return [];
    }
    return companiesStr.split(',').map(c => c.trim().replace(/'/g, ''));
  }
  
  private static extractPeriodCount(dataVolumeStr: string): number {
    const match = dataVolumeStr.match(/(\d+)\s*(quarter|row|period)/i);
    return match ? parseInt(match[1]) : 20; // 默认20期
  }
  
  private static generateGenericParams(companies: string[], timeRange: string, limitCount: number): Record<string, string> {
    return {
      income_fields: 'i.revenue, i.net_income, i.ebit',
      balance_fields: 'b.totalassets, b.shareholder_equity',
      join_clause: `JOIN balance_sheet b USING(symbol, fiscalyear, period)`,
      data_quality_filters: `i.revenue IS NOT NULL AND b.totalassets IS NOT NULL
        ${companies.length > 0 ? `AND i.symbol IN (${companies.map(c => `'${c}'`).join(', ')})` : ''}`,
      lag_join_fields: 'prev_q.totalassets as prev_totalassets',
      metric_formula: '(current_q.net_income / current_q.revenue) * 100',
      metric_name: 'calculated_metric',
      additional_filters: '',
      limit_clause: limitCount > 0 ? `LIMIT ${limitCount}` : ''
    };
  }
}

/**
 * SQL模板填充引擎
 */
export class FinancialSQLGenerator {
  /**
   * 填充模板并生成最终SQL
   */
  static fillTemplate(template: FinancialTimeSeriesTemplate, params: Record<string, string>): string {
    let sql = template.template;
    
    // 替换所有参数
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      sql = sql.replace(placeholder, value);
    });
    
    // 清理未使用的占位符
    sql = sql.replace(/{{[^}]+}}/g, '');
    
    // 格式化SQL
    sql = this.formatSQL(sql);
    
    return sql;
  }
  
  private static formatSQL(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')           // 压缩多余空格
      .replace(/,\s*\n/g, ',\n')      // 格式化逗号换行
      .replace(/\n\s*\n/g, '\n')      // 移除空行
      .trim();
  }
}