import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { createVisualization } from './ai/tools/create-visualization';
import type { getFinancialData } from './ai/tools/financial/unified-financial-data';
import type { 
  extractMDA, 
  extractRiskFactors, 
  extractBusinessOverview 
} from './ai/tools/financial/sec-filings';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type createVisualizationTool = InferUITool<ReturnType<typeof createVisualization>>;
type getFinancialDataTool = InferUITool<typeof getFinancialData>;
type extractMDATool = InferUITool<typeof extractMDA>;
type extractRiskFactorsTool = InferUITool<typeof extractRiskFactors>;
type extractBusinessOverviewTool = InferUITool<typeof extractBusinessOverview>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  createVisualization: createVisualizationTool;
  getFinancialData: getFinancialDataTool;
  extractMDA: extractMDATool;
  extractRiskFactors: extractRiskFactorsTool;
  extractBusinessOverview: extractBusinessOverviewTool;
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
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
