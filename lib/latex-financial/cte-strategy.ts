/**
 * CTE-Based SQL Generation Strategy
 * 使用分步式WITH子句提高LLM SQL生成稳定性
 */
// @ts-nocheck

export interface CTEStep {
  name: string;
  description: string;
  dependencies: string[];
  template: string;
}

/**
 * 标准CTE模式库
 */
export const CTE_PATTERNS = {
  // 模式1: 数据过滤与准备
  base_data_filter: {
    name: 'base_data',
    description: 'Filter and prepare raw financial data',
    dependencies: [],
    template: `
      base_data AS (
        SELECT 
          symbol, 
          company_name,
          period,
          fiscal_year,
          fiscal_quarter,
          {{required_fields}}
        FROM financial_data
        WHERE {{filter_conditions}}
          AND {{required_fields_not_null}}
      )`
  },

  // 模式2: 基础指标计算
  metric_calculation: {
    name: 'metric_calc',
    description: 'Calculate the primary financial metric',
    dependencies: ['base_data'],
    template: `
      metric_calc AS (
        SELECT *,
          {{metric_formula}} as {{metric_name}}
        FROM base_data
        WHERE {{metric_name}} IS NOT NULL
      )`
  },

  // 模式3: 时间序列处理
  time_series_analysis: {
    name: 'time_series',
    description: 'Add time-based calculations (lag, lead, growth)',
    dependencies: ['metric_calc'],
    template: `
      time_series AS (
        SELECT *,
          LAG({{metric_name}}) OVER (
            PARTITION BY symbol 
            ORDER BY period
          ) as prev_{{metric_name}},
          LEAD({{metric_name}}) OVER (
            PARTITION BY symbol 
            ORDER BY period  
          ) as next_{{metric_name}}
        FROM metric_calc
      )`
  },

  // 模式4: 增长率计算
  growth_calculation: {
    name: 'growth_calc',
    description: 'Calculate growth rates and changes',
    dependencies: ['time_series'],
    template: `
      growth_calc AS (
        SELECT *,
          CASE 
            WHEN prev_{{metric_name}} IS NOT NULL AND prev_{{metric_name}} != 0
            THEN ({{metric_name}} - prev_{{metric_name}}) / prev_{{metric_name}} * 100
            ELSE NULL
          END as growth_rate_pct,
          {{metric_name}} - prev_{{metric_name}} as absolute_change
        FROM time_series
      )`
  },

  // 模式5: 排名和统计
  ranking_stats: {
    name: 'ranking',
    description: 'Add rankings and statistical measures',
    dependencies: ['growth_calc'],
    template: `
      ranking AS (
        SELECT *,
          ROW_NUMBER() OVER (
            {{partition_clause}}
            ORDER BY {{metric_name}} DESC
          ) as rank,
          PERCENT_RANK() OVER (
            {{partition_clause}}
            ORDER BY {{metric_name}}
          ) as percentile
        FROM growth_calc
      )`
  },

  // 模式6: 最终输出格式化
  final_output: {
    name: 'final_result',
    description: 'Format final output with required fields',
    dependencies: ['ranking'],
    template: `
      SELECT 
        {{output_fields}}
      FROM ranking
      {{final_filters}}
      {{order_clause}}
      {{limit_clause}}`
  }
};

/**
 * CTE策略生成器
 */
export class CTEStrategyGenerator {
  /**
   * 根据查询需求生成CTE链
   */
  static generateCTEChain(requirements: any): string[] {
    const steps: string[] = [];
    
    // Step 1: 总是需要基础数据过滤
    steps.push('base_data_filter');
    
    // Step 2: 指标计算
    steps.push('metric_calculation');
    
    // Step 3: 根据需求添加时间序列分析
    if (this.needsTimeSeriesAnalysis(requirements)) {
      steps.push('time_series_analysis');
    }
    
    // Step 4: 根据需求添加增长率计算
    if (this.needsGrowthCalculation(requirements)) {
      steps.push('growth_calculation');
    }
    
    // Step 5: 根据需求添加排名
    if (this.needsRanking(requirements)) {
      steps.push('ranking_stats');
    }
    
    // Step 6: 最终输出
    steps.push('final_output');
    
    return steps;
  }
  
  /**
   * 生成完整的CTE SQL
   */
  static generateCTESQL(requirements: any, latexFormula: string): string {
    const steps = this.generateCTEChain(requirements);
    const cteBlocks: string[] = [];
    
    // 准备参数
    const params = this.extractParameters(requirements, latexFormula);
    
    // 生成每个CTE块
    steps.forEach((stepKey, index) => {
      const pattern = CTE_PATTERNS[stepKey];
      if (pattern) {
        let cteBlock = this.fillCTETemplate(pattern.template, params);
        
        // 最后一个不需要逗号
        if (index < steps.length - 1) {
          cteBlock += ',';
        }
        
        cteBlocks.push(cteBlock);
      }
    });
    
    return `WITH\n${cteBlocks.join('\n\n')}`;
  }
  
  /**
   * 生成给LLM的分步指令
   */
  static generateStepByStepPrompt(requirements: any, latexFormula: string): string {
    const steps = this.generateCTEChain(requirements);
    
    return `
# STEP-BY-STEP CTE SQL GENERATION

Generate a CTE-based SQL query following these exact steps:

## LaTeX Formula: ${latexFormula}
## Requirements: ${JSON.stringify(requirements, null, 2)}

**INSTRUCTIONS**: Generate each CTE step separately, then combine them.

${steps.map((stepKey, index) => {
  const pattern = CTE_PATTERNS[stepKey];
  return `
### Step ${index + 1}: ${pattern?.name || stepKey}
**Purpose**: ${pattern?.description || 'Process data'}
**Template**:
\`\`\`sql
${pattern?.template || '-- Template not found'}
\`\`\`
`;
}).join('\n')}

## FINAL OUTPUT FORMAT:
\`\`\`sql
WITH
step1_cte AS (...),
step2_cte AS (...),
...
final_step AS (...)
SELECT * FROM final_step;
\`\`\`

**CRITICAL**: 
1. Each CTE must be syntactically correct
2. Dependencies must be properly referenced
3. Use exact column names from schema
4. Include proper NULL checks and data validation

Generate the complete CTE SQL now:
`;
  }
  
  // 辅助方法
  private static needsTimeSeriesAnalysis(req: any): boolean {
    return req.description?.includes('trend') || 
           req.description?.includes('growth') ||
           req.description?.includes('change') ||
           req.timeRange?.includes('-');
  }
  
  private static needsGrowthCalculation(req: any): boolean {
    return req.description?.includes('growth') ||
           req.description?.includes('change') ||
           req.columnRequirements?.includes('growth');
  }
  
  private static needsRanking(req: any): boolean {
    return req.description?.includes('rank') ||
           req.description?.includes('top') ||
           req.sortAndLimit?.includes('top') ||
           req.columnRequirements?.includes('rank');
  }
  
  private static extractParameters(req: any, formula: string): Record<string, string> {
    // 从需求中提取SQL参数
    return {
      required_fields: this.extractRequiredFields(req, formula),
      filter_conditions: this.buildFilterConditions(req),
      metric_formula: this.convertLatexToSQL(formula),
      metric_name: this.extractMetricName(formula),
      output_fields: req.expectedOutput?.sqlFields || '*',
      // ... 更多参数提取逻辑
    };
  }
  
  private static extractRequiredFields(req: any, formula: string): string {
    // 分析LaTeX公式和需求，确定需要的字段
    const baseFields = ['symbol', 'period', 'company_name'];
    
    // 从公式中推断需要的财务字段
    const financialFields: string[] = [];
    if (formula.includes('NetIncome')) financialFields.push('net_income');
    if (formula.includes('Revenue')) financialFields.push('revenue');
    if (formula.includes('Assets')) financialFields.push('total_assets');
    if (formula.includes('Equity')) financialFields.push('shareholder_equity');
    
    return [...baseFields, ...financialFields].join(', ');
  }
  
  private static buildFilterConditions(req: any): string {
    const conditions: string[] = [];
    
    // 公司过滤
    if (req.querySpecification?.companies !== 'No company restrictions') {
      const companies = req.querySpecification.companies.split(',').map(c => `'${c.trim()}'`).join(', ');
      conditions.push(`symbol IN (${companies})`);
    }
    
    // 时间过滤
    if (req.querySpecification?.timeRange) {
      const timeRange = req.querySpecification.timeRange;
      if (timeRange.includes(' to ') || timeRange.includes('-')) {
        const [start, end] = timeRange.split(/ to |-/).map(t => t.trim());
        conditions.push(`period BETWEEN '${start}' AND '${end}'`);
      } else {
        conditions.push(`period = '${timeRange}'`);
      }
    }
    
    // 其他过滤条件
    if (req.querySpecification?.filterCriteria && 
        req.querySpecification.filterCriteria !== 'No special filters') {
      conditions.push(req.querySpecification.filterCriteria);
    }
    
    return conditions.join('\n    AND ');
  }
  
  private static convertLatexToSQL(formula: string): string {
    // 简单的LaTeX到SQL转换
    return formula
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
      .replace(/NetIncome/g, 'net_income')
      .replace(/Revenue/g, 'revenue')
      .replace(/Assets/g, 'total_assets')
      .replace(/Equity/g, 'shareholder_equity')
      .replace(/EBIT/g, 'ebit');
  }
  
  private static extractMetricName(formula: string): string {
    // 从公式中推断指标名称
    if (formula.includes('ROE')) return 'roe';
    if (formula.includes('ROCE')) return 'roce';
    if (formula.includes('ROA')) return 'roa';
    return 'calculated_metric';
  }
  
  private static fillCTETemplate(template: string, params: Record<string, string>): string {
    let result = template;
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, value);
    });
    return result;
  }
}

/**
 * CTE性能优化建议
 */
export const CTE_PERFORMANCE_TIPS = {
  advantages: [
    "DuckDB有优秀的CTE优化器，会自动内联简单的CTE",
    "复杂计算分步进行，减少重复计算",
    "更好的查询计划，优化器可以重排序执行步骤",
    "内存使用更可控，避免大表JOIN产生笛卡尔积"
  ],
  
  bestPractices: [
    "避免不必要的SELECT *，只选择需要的字段",
    "在早期CTE中进行数据过滤，减少后续处理量", 
    "使用适当的索引字段进行JOIN和排序",
    "复杂聚合计算放在专门的CTE中"
  ],
  
  performanceComparison: {
    simpleQueries: "CTE vs 单句SQL: 性能相当，可读性更好",
    complexQueries: "CTE通常更快，因为优化器可以更好地理解查询意图",
    debugging: "CTE可以单独测试每一步，极大降低调试难度"
  }
};