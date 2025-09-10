/**
 * LaTeX Financial Engine Types
 * 全新的LaTeX-first财务计算引擎类型定义
 */

// 数据源表定义
export type DataTable = 
  | 'income_statement' 
  | 'balance_sheet' 
  | 'cash_flow_statement';

// 变量映射：LaTeX变量名 → 数据库字段
export interface VariableMapping {
  table: DataTable;
  field: string;
  description?: string;
}

// LaTeX指标定义
export interface LaTeXMetricDefinition {
  name: string;
  description: string;
  category: string;
  latexFormula: string;
  exampleResult?: {
    symbol: string;
    value: number;
    period: string;
  };
}

// 计算请求
export interface LaTeXCalculationRequest {
  metricDefinition: LaTeXMetricDefinition;
  query: string;  // 用户的自然语言查询
}

// 计算结果
export interface LaTeXCalculationResult {
  metric: string;
  data: any[]; // Flexible array to hold all SQL result rows with all fields
  metadata: {
    executionTimeMs: number;
    generatedSQL: string;
    rowsProcessed: number;
    displayedRows: number;
    hasMoreRows: boolean;
    warning?: string;
    cacheHit?: boolean;
    sqlGenerationTimeMs?: number;
    duckdbExecutionTimeMs?: number;
  };
}

// SQL生成上下文
export interface SQLGenerationContext {
  latexFormula: string;
  query: string;  // 用户的自然语言查询
}

// LLM生成的SQL响应
export interface LLMSQLResponse {
  sql: string;
  explanation?: string;
  estimatedComplexity: number;  // 1-10
  usesWindowFunctions: boolean;
  usesCTE: boolean;
  expectedExecutionTime?: string;
}

// 错误类型
export class LaTeXEngineError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_LATEX' | 'SQL_GENERATION_FAILED' | 'EXECUTION_ERROR' | 'VALIDATION_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'LaTeXEngineError';
  }
}

// 内置指标模板
export interface BuiltInMetricTemplate {
  id: string;
  name: string;
  latexFormula: string;
  variableMapping: Record<string, VariableMapping>;
  category: string;
  description: string;
}