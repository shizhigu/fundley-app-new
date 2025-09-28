// Simplified providers file for deployment
import type { ModelId } from './models';

// Mock model objects for build compatibility
export const financialFieldsModel = { modelId: 'mock-financial-model' };
export const subAgentModel = { modelId: 'mock-sub-agent-model' };
export const testModel = { modelId: 'mock-test-model' };

// Mock function for compatibility
export function getModel(modelId: ModelId) {
  return { modelId };
}

// Mock model configs
export const MODEL_MAPPINGS = {
  'grok-beta': 'grok-beta',
  'grok-vision-beta': 'grok-vision-beta',
  'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
  'gemini-1.5-pro': 'gemini-1.5-pro',
  'gpt-4o': 'gpt-4o',
  'o1-preview': 'o1-preview',
  'o1-mini': 'o1-mini',
};