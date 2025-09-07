import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.enum(['image/jpeg', 'image/png']),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

// Tool-related parts for AI SDK v5
const toolCallPartSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.any(),
});

const toolResultPartSchema = z.object({
  type: z.literal('tool-result'),
  toolCallId: z.string(),
  result: z.any(),
});

const partSchema = z.union([
  textPartSchema, 
  filePartSchema, 
  toolCallPartSchema, 
  toolResultPartSchema
]);

export const postRequestBodySchema = z.object({
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(['user', 'assistant']), // Support both user and assistant messages
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum(['grok-3', 'gemini-2.5-pro', 'gpt-5', 'sonar']),
  chatId: z.string().optional(), // Support dynamic chat selection
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
