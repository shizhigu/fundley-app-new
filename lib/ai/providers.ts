import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import type { ModelId } from './models';

// Configure OpenRouter with API key
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model mappings - just change these strings to switch models
const MODEL_MAPPINGS: Record<ModelId, string> = {
  'grok-3': 'x-ai/grok-3',
  'gemini-2.5-pro': 'google/gemini-2.5-pro', 
  'gpt-5': 'openai/gpt-5',
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
export const titleModel = openrouter('x-ai/grok-3-fast'); // Lightweight for titles
export const artifactModel = openrouter('x-ai/grok-3'); // Full model for artifacts