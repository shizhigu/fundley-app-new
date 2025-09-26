/**
 * 财务数据相关的统一类型定义
 * 用于替代分散在各个文件中的重复类型定义
 */

// 基础类型
export type TrendDirection = 'up' | 'down' | 'neutral';
export type ViewMode = 'table' | 'cards';
export type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual';

// 趋势数据
export interface TrendData {
  value: number | null;
  direction: TrendDirection;
}

// 财务指标元数据
export interface FinancialMetric {
  id: string;
  name: string;
  description: string;
  category: string;
  sqlFormula: string;
  latexFormula?: string;
}

// 财务指标值（包含趋势数据）
export interface MetricValue {
  value: number | null;
  qoq: TrendData;
  yoy: TrendData;
}

// 单条财务数据记录
export interface FinancialDataPoint {
  symbol: string;
  fiscalYear: number;
  period: Period | string;
  date: string | null;
  metrics: Record<string, MetricValue>;
}

// API请求接口
export interface FinancialAnalysisRequest {
  symbols: string[];
  metricIds: string[];
  quarters: number;
}

// API响应接口（与后端保持一致）
export interface FinancialAnalysisResponse {
  symbol: string;
  fiscalYear: number;
  period: string;
  date: string | null;
  metrics: Record<string, MetricValue>;
}

// 可用指标定义（用于Store）
export interface AvailableMetric {
  name: string;
  latex: string;
  sql: string;
}

// 财务分析表单状态
export interface FinancialAnalysisForm {
  symbols: string; // 股票代码，逗号分隔
  selectedMetrics: string[]; // 选中的财务指标ID
  periods: number; // 历史季度数
}

// 错误类型
export interface FinancialDataError {
  message: string;
  code?: string;
  details?: string;
}

// 加载状态
export interface LoadingState {
  isLoading: boolean;
  error: FinancialDataError | null;
}

// LaTeX指标接口（从数据库获取）
export interface LaTeXMetric {
  _id: string;
  name: string;
  description: string;
  category: string;
  latexFormula: string;
  sqlFormula?: string;
}

// 导出用的Excel数据格式
export interface ExcelDataRow {
  '股票代码': string;
  '季度': string;
  '日期': string;
  [metricName: string]: string | number;
}

// 数据服务接口
export interface FinancialDataService {
  fetchData(request: FinancialAnalysisRequest): Promise<FinancialDataPoint[]>;
  getAvailableMetrics(): Promise<FinancialMetric[]>;
}

// Store状态接口
export interface FinancialDataState {
  // 核心数据
  data: FinancialDataPoint[];
  availableMetrics: AvailableMetric[];

  // 表单状态
  analysisForm: FinancialAnalysisForm;

  // UI状态
  viewMode: ViewMode;
  isPanelCollapsed: boolean;

  // 加载状态
  isLoading: boolean;
  error: FinancialDataError | null;

  // 元数据
  lastUpdated: string | null;
  isActive: boolean;
}