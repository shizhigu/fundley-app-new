/**
 * Enhanced LaTeX Formula Definitions with Time Series Semantics
 * 解决LLM对财务公式时间序列理解的偏差
 */

export interface EnhancedLatexFormula {
  name: string;
  latexFormula: string;
  // 关键：明确的时间序列语义
  timeSeriesSemantics: {
    requiresPreviousPeriod: boolean;
    periodDefinition: string;
    missingDataHandling: 'null' | 'skip' | 'fallback';
    crossYearHandling?: string;
  };
  // 精确的SQL实现指导
  sqlImplementationGuide: {
    joinStrategy: 'lag_window' | 'self_join' | 'relative_quarter';
    requiredTables: string[];
    criticalFilters: string[];
    calculationOrder: string[];
  };
  // 数据验证规则
  dataValidation: {
    requiredFields: string[];
    nullHandling: Record<string, string>;
    edgeCases: string[];
  };
  // 完整的SQL示例（基于你的正确版本）
  referenceSQLExample: string;
}

/**
 * 增强的财务公式定义库
 */
export const ENHANCED_FINANCIAL_FORMULAS: Record<string, EnhancedLatexFormula> = {
  
  ROCE: {
    name: 'Return on Capital Employed',
    latexFormula: 'ROCE = \\frac{EBIT_t}{\\overline{CapitalEmployed_{t,t-1}}}',
    
    timeSeriesSemantics: {
      requiresPreviousPeriod: true,
      periodDefinition: 'Previous period means: For Q1-2024, previous is Q4-2023. For Q2-2024, previous is Q1-2024. NOT simple LAG() ordering.',
      missingDataHandling: 'null',
      crossYearHandling: 'Q4-2023 → Q1-2024 is valid transition'
    },
    
    sqlImplementationGuide: {
      joinStrategy: 'relative_quarter',
      requiredTables: ['income_statement', 'balance_sheet'],
      criticalFilters: [
        'period IN (\'Q1\', \'Q2\', \'Q3\', \'Q4\')',  // Exclude FY
        'ebit IS NOT NULL',
        'totalassets IS NOT NULL',
        'totalcurrentliabilities IS NOT NULL'
      ],
      calculationOrder: [
        '1. Create relative_quarter ranking with proper Q4→Q1 handling',
        '2. Self-join on relative_quarter - 1 for previous period',
        '3. Calculate average capital employed: (current + previous) / 2',
        '4. Return NULL if previous period data missing'
      ]
    },
    
    dataValidation: {
      requiredFields: ['ebit', 'totalassets', 'totalcurrentliabilities'],
      nullHandling: {
        'ebit': 'REQUIRED - return NULL if missing',
        'totalassets': 'REQUIRED - return NULL if missing', 
        'totalcurrentliabilities': 'REQUIRED - return NULL if missing',
        'previous_period_data': 'REQUIRED - return NULL if missing, DO NOT use COALESCE fallback'
      },
      edgeCases: [
        'Capital employed = 0: return NULL',
        'First period for company: return NULL (no previous data)',
        'Negative capital employed: still calculate (can happen)'
      ]
    },
    
    referenceSQLExample: `
WITH quarterly_ranked AS (
    SELECT 
        i.symbol, i.fiscalyear, i.period, i.date, i.ebit,
        b.totalassets, b.totalcurrentliabilities,
        ROW_NUMBER() OVER (
            PARTITION BY i.symbol 
            ORDER BY i.fiscalyear DESC, 
                     CASE i.period 
                       WHEN 'Q4' THEN 1 WHEN 'Q3' THEN 2 
                       WHEN 'Q2' THEN 3 WHEN 'Q1' THEN 4 
                     END
        ) - 1 as relative_quarter
    FROM income_statement i
    JOIN balance_sheet b ON (i.symbol = b.symbol AND i.fiscalyear = b.fiscalyear AND i.period = b.period)
    WHERE i.period IN ('Q1', 'Q2', 'Q3', 'Q4')
        AND i.ebit IS NOT NULL AND b.totalassets IS NOT NULL AND b.totalcurrentliabilities IS NOT NULL
),
roce_calculation AS (
    SELECT current_q.*, prev_q.totalassets as prev_year_totalassets, prev_q.totalcurrentliabilities as prev_year_totalcurrentliabilities,
        CASE WHEN prev_q.totalassets IS NOT NULL AND prev_q.totalcurrentliabilities IS NOT NULL 
                AND ((current_q.totalassets + prev_q.totalassets) / 2.0 - (current_q.totalcurrentliabilities + prev_q.totalcurrentliabilities) / 2.0) != 0
             THEN ROUND((current_q.ebit::NUMERIC / ((current_q.totalassets + prev_q.totalassets) / 2.0 - (current_q.totalcurrentliabilities + prev_q.totalcurrentliabilities) / 2.0)) * 100, 2)
             ELSE NULL END as roce_pct
    FROM quarterly_ranked current_q
    LEFT JOIN quarterly_ranked prev_q ON (current_q.symbol = prev_q.symbol AND current_q.relative_quarter = prev_q.relative_quarter - 1)
)
SELECT symbol, relative_quarter, roce_pct, fiscalyear, period, date
FROM roce_calculation WHERE roce_pct IS NOT NULL ORDER BY symbol, relative_quarter;`
  },

  ROE: {
    name: 'Return on Equity',
    latexFormula: 'ROE = \\frac{NetIncome_t}{\\overline{ShareholderEquity_{t,t-1}}}',
    
    timeSeriesSemantics: {
      requiresPreviousPeriod: true,
      periodDefinition: 'Previous period follows same quarterly logic as ROCE',
      missingDataHandling: 'null'
    },
    
    sqlImplementationGuide: {
      joinStrategy: 'relative_quarter',
      requiredTables: ['income_statement', 'balance_sheet'],
      criticalFilters: [
        'period IN (\'Q1\', \'Q2\', \'Q3\', \'Q4\')',
        'net_income IS NOT NULL',
        'shareholder_equity IS NOT NULL',
        'shareholder_equity > 0'
      ],
      calculationOrder: [
        '1. Create relative_quarter ranking',
        '2. Self-join for previous period equity',
        '3. Calculate average equity: (current + previous) / 2',
        '4. ROE = net_income / avg_equity'
      ]
    },
    
    dataValidation: {
      requiredFields: ['net_income', 'shareholder_equity'],
      nullHandling: {
        'net_income': 'REQUIRED',
        'shareholder_equity': 'REQUIRED and > 0',
        'previous_equity': 'REQUIRED - no fallback'
      },
      edgeCases: [
        'Negative equity: return NULL',
        'Zero equity: return NULL',
        'First period: return NULL'
      ]
    },
    
    referenceSQLExample: `-- Similar structure to ROCE but with net_income/shareholder_equity`
  },

  ROA: {
    name: 'Return on Assets', 
    latexFormula: 'ROA = \\frac{NetIncome_t}{\\overline{TotalAssets_{t,t-1}}}',
    
    timeSeriesSemantics: {
      requiresPreviousPeriod: true,
      periodDefinition: 'Previous period follows quarterly logic',
      missingDataHandling: 'null'
    },
    
    sqlImplementationGuide: {
      joinStrategy: 'relative_quarter',
      requiredTables: ['income_statement', 'balance_sheet'],
      criticalFilters: [
        'period IN (\'Q1\', \'Q2\', \'Q3\', \'Q4\')',
        'net_income IS NOT NULL',
        'total_assets IS NOT NULL',
        'total_assets > 0'
      ],
      calculationOrder: [
        '1. Create relative_quarter ranking',
        '2. Self-join for previous period assets',
        '3. Calculate average assets',
        '4. ROA = net_income / avg_assets'
      ]
    },
    
    dataValidation: {
      requiredFields: ['net_income', 'total_assets'],
      nullHandling: {
        'net_income': 'REQUIRED',
        'total_assets': 'REQUIRED and > 0',
        'previous_assets': 'REQUIRED'
      },
      edgeCases: ['Zero assets: return NULL', 'First period: return NULL']
    },
    
    referenceSQLExample: `-- Similar to ROCE but simpler - just net_income/avg_assets`
  }
};

/**
 * LaTeX公式解释生成器
 */
export class LatexFormulaExplainer {
  /**
   * 为LLM生成超详细的公式解释
   */
  static generateDetailedExplanation(formulaKey: string): string {
    const formula = ENHANCED_FINANCIAL_FORMULAS[formulaKey];
    if (!formula) return '';
    
    return `
# DETAILED FORMULA EXPLANATION: ${formula.name}

## LaTeX Formula: ${formula.latexFormula}

## CRITICAL TIME SERIES RULES:
${formula.timeSeriesSemantics.requiresPreviousPeriod ? `
⚠️  **REQUIRES PREVIOUS PERIOD DATA**
- Previous Period Definition: ${formula.timeSeriesSemantics.periodDefinition}
- Missing Data Handling: ${formula.timeSeriesSemantics.missingDataHandling.toUpperCase()}
- Cross-Year Handling: ${formula.timeSeriesSemantics.crossYearHandling || 'Standard quarterly progression'}
` : 'No previous period data required'}

## SQL IMPLEMENTATION STRATEGY:
- **Join Strategy**: ${formula.sqlImplementationGuide.joinStrategy}
- **Required Tables**: ${formula.sqlImplementationGuide.requiredTables.join(', ')}
- **Critical Filters**: 
${formula.sqlImplementationGuide.criticalFilters.map(f => `  - ${f}`).join('\n')}

## CALCULATION ORDER (MANDATORY):
${formula.sqlImplementationGuide.calculationOrder.map((step, i) => `${i+1}. ${step}`).join('\n')}

## DATA VALIDATION RULES:
**Required Fields**: ${formula.dataValidation.requiredFields.join(', ')}

**NULL Handling**:
${Object.entries(formula.dataValidation.nullHandling).map(([field, rule]) => `- ${field}: ${rule}`).join('\n')}

**Edge Cases**:
${formula.dataValidation.edgeCases.map(edge => `- ${edge}`).join('\n')}

## REFERENCE SQL (PROVEN CORRECT):
\`\`\`sql
${formula.referenceSQLExample}
\`\`\`

## COMMON LLM MISTAKES TO AVOID:
1. ❌ Using LAG() with fiscal period ordering
2. ❌ Using COALESCE(prev_value, current_value) as fallback
3. ❌ Including FY (annual) data with quarterly data
4. ❌ Simple alphabetical sorting of periods (Q1 < Q2 < Q3 < Q4)
5. ❌ Not handling cross-year quarterly transitions

## CORRECT APPROACH:
✅ Use relative_quarter with proper Q4→Q1 handling
✅ Return NULL when previous period data missing
✅ Filter out FY data for quarterly analysis
✅ Use explicit JOIN ON relative_quarter - 1
`;
  }
}

/**
 * SQL模式验证器
 */
export class SQLPatternValidator {
  /**
   * 验证生成的SQL是否遵循正确模式
   */
  static validatePattern(sql: string, formulaKey: string): { isValid: boolean; issues: string[] } {
    const formula = ENHANCED_FINANCIAL_FORMULAS[formulaKey];
    const issues: string[] = [];
    
    // 检查是否使用了错误的LAG模式
    if (sql.includes('LAG(') && sql.includes('ORDER BY') && sql.includes('fiscalyear, period')) {
      issues.push('❌ Using incorrect LAG() with fiscal ordering - should use relative_quarter self-join');
    }
    
    // 检查是否使用了COALESCE fallback
    if (sql.includes('COALESCE(') && formulaKey === 'ROCE') {
      issues.push('❌ Using COALESCE fallback for previous period - should return NULL instead');
    }
    
    // 检查是否过滤了FY数据
    if (!sql.includes("period IN ('Q1', 'Q2', 'Q3', 'Q4')") && !sql.includes('period = \'Q')) {
      issues.push('❌ Not filtering out FY data - should include period IN (Q1,Q2,Q3,Q4)');
    }
    
    // 检查是否使用了relative_quarter概念
    if (formula.sqlImplementationGuide.joinStrategy === 'relative_quarter' && 
        !sql.includes('relative_quarter')) {
      issues.push('❌ Not using relative_quarter approach - required for proper time series');
    }
    
    // 检查必需字段
    formula.dataValidation.requiredFields.forEach(field => {
      if (!sql.toLowerCase().includes(field.toLowerCase())) {
        issues.push(`❌ Missing required field: ${field}`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}