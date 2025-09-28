import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { getFinancialData } from './ai/tools/financial/unified-financial-data';
import type { 
  extractMDA, 
  extractRiskFactors, 
  extractBusinessOverview 
} from './ai/tools/financial/sec-filings';
import type { 
  createLatexMetric, 
  calculateLatexMetric, 
  searchLatexMetrics,
  getPopularLatexMetrics 
} from './ai/tools/financial/latex-tools';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type getFinancialDataTool = InferUITool<typeof getFinancialData>;
type extractMDATool = InferUITool<typeof extractMDA>;
type extractRiskFactorsTool = InferUITool<typeof extractRiskFactors>;
type extractBusinessOverviewTool = InferUITool<typeof extractBusinessOverview>;
type createLatexMetricTool = InferUITool<typeof createLatexMetric>;
type calculateLatexMetricTool = InferUITool<typeof calculateLatexMetric>;
type searchLatexMetricsTool = InferUITool<typeof searchLatexMetrics>;
type getPopularLatexMetricsTool = InferUITool<typeof getPopularLatexMetrics>;

export type ChatTools = {
  getWeather: weatherTool;
  requestSuggestions: requestSuggestionsTool;
  getFinancialData: getFinancialDataTool;
  extractMDA: extractMDATool;
  extractRiskFactors: extractRiskFactorsTool;
  extractBusinessOverview: extractBusinessOverviewTool;
  createLatexMetric: createLatexMetricTool;
  calculateLatexMetric: calculateLatexMetricTool;
  searchLatexMetrics: searchLatexMetricsTool;
  getPopularLatexMetrics: getPopularLatexMetricsTool;
  // Allow additional tools to be added dynamically
  [key: string]: any;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  error: string;
  chartIndicator: ChartIndicator;
};

export interface ChartIndicator {
  id: string;
  name: string;
  type: 'line' | 'histogram' | 'area' | 'step-line';
  data: IndicatorData[];
  color?: string;
  paneHeight?: number;
  markers?: Array<{
    time: string;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text: string;
    size: number;
  }>;
  metadata?: {
    dataType?: string;
    quarters?: string[];
    filingDates?: string[];
    unit?: string;
    dataPoints?: number;
  };
}

export interface IndicatorData {
  time: string;
  value: number;
}

// Tool data for ADK integration
export interface ToolData {
  toolName: string;
  status: 'running' | 'completed' | 'failed';
  args?: any;
  result?: any;
  callId?: string;
}

export type MessageType = 'text' | 'tool_call' | 'tool_result';

// Extended ChatMessage to support tool messages
export interface ExtendedChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  parts: any[];
  createdAt: Date;
  messageType?: MessageType;
  toolData?: ToolData;
  invocation_id?: string; // Add invocation_id field
}

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
> | ExtendedChatMessage;

// Invocation grouping types
export interface MessageInvocation {
  invocationId: string;
  userMessage: ChatMessage;
  assistantMessage?: ChatMessage;
  toolMessages: ChatMessage[];
  timestamp: Date; // Based on user message timestamp
}

export interface Attachment {
  name: string;
  url?: string; // 可选，因为我们现在直接使用File对象
  contentType: string;
  file?: File; // 新增File对象属性
  size?: number; // 可选文件大小
}
