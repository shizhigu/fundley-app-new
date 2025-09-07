export const DEFAULT_MODEL = 'gemini-2.5-pro';

// Specialized model for suggestion generation and data verification
export const SUGGESTION_MODEL = 'deepseek/deepseek-r1-0528-qwen3-8b';

// Simple model configuration
export const AVAILABLE_MODELS = {
  'grok-3': {
    name: 'Grok',
    description: 'xAI',
  },
  'gemini-2.5-pro': {
    name: 'Gemini', 
    description: 'Google',
  },
  'gpt-5': {
    name: 'GPT',
    description: 'OpenAI',
  },
  'sonar': {
    name: 'Search',
    description: 'Perplexity',
  },
} as const;

export type ModelId = keyof typeof AVAILABLE_MODELS;

// For backwards compatibility with existing ChatModel interface
export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: ChatModel[] = Object.entries(AVAILABLE_MODELS).map(([id, config]) => ({
  id,
  ...config,
}));