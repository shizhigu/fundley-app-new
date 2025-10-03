// 简化的模型配置 - 仅用于UI展示，无实际逻辑
export const DEFAULT_MODEL_ID = 'gemini-2.5-pro';
export const SUGGESTION_MODEL = 'google/gemini-2.5-flash-lite';

// UI展示用的模型列表（无实际功能）
export const DISPLAY_MODELS = [
  { id: 'grok-3', name: 'Grok' },
  { id: 'gemini-2.5-pro', name: 'Gemini' },
  { id: 'gpt-5', name: 'GPT' },
  { id: 'Fast', name: 'Fast' },
] as const;
