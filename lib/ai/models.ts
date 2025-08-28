export const DEFAULT_MODEL = 'grok-3';

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