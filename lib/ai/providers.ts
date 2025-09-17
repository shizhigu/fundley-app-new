import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createXai } from '@ai-sdk/xai';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import type { ModelId } from './models';

// Configure OpenRouter with API key
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Configure xAI with direct API key
const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

// Model mappings - just change these strings to switch models
const MODEL_MAPPINGS: Record<ModelId, string> = {
  'grok-3': 'x-ai/grok-3',
  'gemini-2.5-pro': 'google/gemini-2.5-pro', 
  'gpt-5': 'openai/gpt-5-chat',
  'Fast': 'openai/gpt-5-nano',
};

// Main model function - this is what everything uses
export function getLanguageModel(modelId: ModelId) {
  const actualModel = MODEL_MAPPINGS[modelId];
  
  return wrapLanguageModel({
    model: openrouter(actualModel),
    middleware: extractReasoningMiddleware({ tagName: 'thinking' }),
  });
}

// Special purpose models
export const titleModel = openrouter('google/gemini-2.5-flash-lite'); // Lightweight for titles
export const artifactModel = openrouter('google/gemini-2.5-pro'); // Full model for artifacts

// Sub-agent models - optimized for specific tasks
export const financialFieldsModel = xai('grok-code-fast'); // Direct xAI connection for fast code generation
export const subAgentModel = openrouter('google/gemini-2.5-flash'); // General purpose sub-agent model